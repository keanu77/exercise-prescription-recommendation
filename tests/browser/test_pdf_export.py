"""Real A4 PDFs: retry/concurrency, Chinese text, printable bounds and long reports.
Requires Poppler (pdftotext) in addition to Python Playwright.
All inputs are synthetic; no AI calls are made.
"""
import json
import os
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
OUT = Path(os.environ.get('PDF_OUTPUT_DIR', '/private/tmp/exercise-ux-review'))
OUT.mkdir(parents=True, exist_ok=True)
BROWSERS = os.environ.get('PDF_BROWSERS', 'chromium').split(',')


def compact(value):
    return re.sub(r'\s+', '', str(value))


def verify_pdf(path, report):
    assert path.read_bytes().startswith(b'%PDF-')
    assert 10000 < path.stat().st_size < 600000, path.stat().st_size
    extracted = subprocess.check_output(['pdftotext', '-layout', str(path), '-'], text=True)
    normalized = compact(extracted)
    expected = [report['title'], report['notice']['title'], report['notice']['body'], report['disclaimer']]
    for section in report['sections']:
        expected.append(section['title'])
        for item in section['items']:
            expected.extend(item if isinstance(item, list) else [item])
    # Running headers/footers and repeated table labels interrupt extraction
    # across page boundaries; remove only those known layout strings for long items.
    flow = normalized
    for value in ['MOVE WITH PURPOSE', report['date'], report['title'],
                  '運動醫學科 吳易澄醫師 | sportsmedicine.tw']:
        flow = flow.replace(compact(value), '')
    for section in report['sections']:
        flow = flow.replace(compact(section['title'] + '（續）'), '')
        if section['kind'] == 'rows':
            for label, _value in section['items']:
                flow = flow.replace(compact(label), '')
    flow = re.sub(r'\d+/\d+', '', flow)
    for text in expected:
        # Values were sanitized with cleanPDFText in the browser before returning.
        assert compact(text) in (flow if len(str(text)) > 1000 else normalized), f'{path.name}: missing text {str(text)[:100]}'
    xml = subprocess.check_output(['pdftotext', '-bbox', str(path), '-'], text=True)
    root = ET.fromstring(xml)
    ns = {'x': 'http://www.w3.org/1999/xhtml'}
    pages = root.findall('.//x:page', ns)
    for n, page in enumerate(pages, 1):
        words = page.findall('.//x:word', ns)
        assert len(words) > 12, f'{path.name}: blank or near-empty page {n}'
        boxes = [{k: float(word.attrib[k]) for k in ['xMin', 'xMax', 'yMin', 'yMax']} for word in words]
        for box in boxes:
            assert 49 <= box['xMin'] < box['xMax'] <= 548, (path.name, n, box)
            assert 30 <= box['yMin'] < box['yMax'] <= 830, (path.name, n, box)
        for i, a in enumerate(boxes):
            for b in boxes[i + 1:]:
                overlap_x = min(a['xMax'], b['xMax']) - max(a['xMin'], b['xMin'])
                overlap_y = min(a['yMax'], b['yMax']) - max(a['yMin'], b['yMin'])
                assert overlap_x < 0.8 or overlap_y < 0.8, (path.name, n, 'overlapping text', a, b)
        text = compact(''.join(word.text or '' for word in words))
        assert f'{n}/{len(pages)}' in text, (path.name, 'missing page number')
    path.with_suffix('.txt').write_text(extracted)
    return len(pages), normalized


with sync_playwright() as p:
    for engine in BROWSERS:
        browser = getattr(p, engine).launch(headless=True)
        for standalone in [False, True]:
            page = browser.new_page(accept_downloads=True, viewport={'width': 1440, 'height': 1000},
                                    ignore_https_errors=BASE.startswith('https://127.0.0.1:'))
            errors, alerts, library_requests = [], [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('dialog', lambda dialog: (alerts.append(dialog.message), dialog.dismiss()))
            page.on('request', lambda request: library_requests.append(request.url)
                    if '/jspdf/' in request.url or '/html2canvas/' in request.url or '/assets/fonts/' in request.url else None)
            page.goto(BASE + ('/parq-form.html' if standalone else '/'), wait_until='networkidle')
            assert not library_requests, 'PDF dependencies must be lazy'
            page.get_by_role('button', name='開始評估' if standalone else '開始使用', exact=True).click()
            page.fill('#age', '35'); page.select_option('#gender', 'male')
            page.fill('#height', '170.5'); page.fill('#weight', '70.5')
            if standalone:
                page.get_by_role('button', name='進入 PAR-Q+ 問卷 →', exact=True).click()
                for i in range(1, 8):
                    page.locator(f'input[name="q{i}"][value="no"]').check()
                page.get_by_role('button', name='完成評估並查看結果 →', exact=True).click()
            else:
                page.evaluate('''() => {
                  const pick = (name, value) => document.querySelector(`input[name="${name}"][value="${value}"]`).checked = true;
                  pick('health_status', 'healthy'); pick('fitness_level', 'good');
                  pick('exercise_habit', 'moderate'); pick('exercise_goal', 'health');
                  for (let i=1; i<=7; i++) pick(`parq_q${i}`, 'no');
                  generatePrescription(); showPage('resultPage');
                }''')
            button = page.locator('#downloadPdfButton' if standalone else '#downloadPrescription')
            page.evaluate('''() => {
              window.realPDFLoader = loadPDFLibraries; window.loadCount = 0;
              window.loadPDFLibraries = () => {
                window.loadCount++;
                return new Promise((_resolve, reject) => { window.failPDFLoad = reject; });
              };
            }''')
            button.click(); expect(button).to_be_disabled(); page.evaluate('downloadPDF()')
            assert page.evaluate('window.loadCount') == 1
            page.evaluate("window.failPDFLoad(new Error('mock PDF failure'))")
            expect(button).to_be_enabled()
            assert len(alerts) == 1
            page.evaluate('() => { window.loadPDFLibraries = window.realPDFLoader; }')
            page.route('**/assets/fonts/*.ttf', lambda route: route.fulfill(status=503, body='temporary failure'))
            state = page.evaluate('''async () => {
              const first = loadPDFLibraries(), second = loadPDFLibraries();
              try { await Promise.all([first, second]); } catch (error) { return {same:first === second, rejected:true, error:String(error)}; }
              return {same:first === second, rejected:false};
            }''')
            assert state['same'] and state['rejected'], (state, library_requests)
            page.unroute('**/assets/fonts/*.ttf')
            state = page.evaluate('''async () => {
              const first = loadPDFLibraries(), second = loadPDFLibraries();
              await Promise.all([first, second]);
              return first === second && !!window.jspdf?.jsPDF && !!pdfFontData;
            }''')
            assert state
            assert len(library_requests) == 3, library_requests  # jsPDF, failed font, successful font
            assert not any('html2canvas' in url for url in library_requests)

            scenarios = ['standard', 'mobile', 'over45', 'moderate', 'high'] if standalone else ['standard', 'mobile', 'child', 'high', 'long', 'ai-appendix']
            baseline = page.evaluate('JSON.parse(JSON.stringify(basicInfo))' if standalone else 'JSON.parse(JSON.stringify(window.lastFormData))')
            standard_text = None
            for scenario in scenarios:
                page.set_viewport_size({'width': 390 if scenario == 'mobile' else 1440, 'height': 1000})
                if standalone:
                    page.evaluate('''({base, scenario}) => {
                      basicInfo = {...base};
                      parqAnswers = Object.fromEntries(Array.from({length:7}, (_,i) => [`q${i+1}`, 'no']));
                      if (scenario === 'over45') basicInfo.age = 65;
                      if (scenario === 'moderate') parqAnswers.q5 = 'yes';
                      if (scenario === 'high') for (let i=1; i<=7; i++) parqAnswers[`q${i}`] = 'yes';
                      generateAssessment();
                    }''', {'base': baseline, 'scenario': scenario})
                else:
                    page.evaluate('''({base, scenario}) => {
                      resetAISection();
                      window.lastFormData = JSON.parse(JSON.stringify(base));
                      if (scenario === 'child') Object.assign(window.lastFormData, {age:12, gender:'other'});
                      if (scenario === 'high') Object.assign(window.lastFormData, {
                        age:72, diseases:['hypertension','diabetes','heart_recovery','arthritis'],
                        limitations:['pain','balance','palpitation'],
                        parq_answers: Object.fromEntries(Array.from({length:7},(_,i)=>[`parq_q${i+1}`,'yes']))
                      });
                      window.lastPrescription = calculateFITTVP(window.lastFormData);
                      if (scenario === 'ai-appendix') {
                        lastAIResult={advice:{summary:'測試用的生活行動附錄',startToday:['安排方便的時段。','準備需要的用品。'],adaptations:['記下生活中的限制。','和專業人員討論調整。'],checkIn:['記錄自己的感受。','留意健康狀況變化。']},safety:'本附錄不是新處方，請依原處方與醫師建議。',mode:'actions',meta:{model:'test-only',generatedAt:'2026-09-27T00:00:00Z',rulesVersion:ExerciseRules.rulesVersion,promptVersion:'action-cards-2'}};
                        document.getElementById('includeAiInPdf').checked=true;
                      }
                      if (scenario === 'long') {
                        window.lastPrescription.progression = '長表格測試：' + '每次活動後記錄感受與恢復狀況。'.repeat(180) + '表格結束。';
                        window.lastPrescription.recommendations.push('長段落測試：' + '依計畫逐步活動並記錄身體反應。'.repeat(200) + '段落結束。');
                      }
                    }''', {'base': baseline, 'scenario': scenario})
                report = page.evaluate('''() => {
                  const report = createPDFReport();
                  report.sections.forEach(s => s.items = s.items.map(i => Array.isArray(i) ? i.map(cleanPDFText) : cleanPDFText(i)));
                  return report;
                }''')
                with page.expect_download(timeout=60000) as event:
                    button.click()
                target = OUT / f'{engine}-{"parq" if standalone else "exercise"}-{scenario}.pdf'
                event.value.save_as(target)
                assert event.value.failure() is None
                count, text = verify_pdf(target, report)
                if scenario == 'standard':
                    assert count == 2, count
                    standard_text = text
                if scenario == 'mobile':
                    assert count == 2 and text == standard_text, 'Viewport changed report content or pagination'
                if scenario == 'ai-appendix':
                    assert count >= 3 and 'AI協助選取的生活行動' in text and 'test-only' in text
                if scenario == 'long':
                    assert count >= 4 and '表格結束。' in text and '段落結束。' in text
                if scenario == 'child':
                    assert '未滿18歲' in text and '不適用' in text
                if scenario == 'high':
                    assert '高風險' in text and '醫師評估' in text
                expect(button).to_be_enabled()
                assert page.locator('#pdfLoadingStatus, #pdfExportContent, #loadingModal.active').count() == 0
                assert len(library_requests) == 3, 'Exports must reuse the loaded font and jsPDF'
                print(f'[OK] {target.name}: {count} pages, {target.stat().st_size} bytes; all text present, no overlaps, printable margins')
            assert len(alerts) == 1 and not errors, (alerts, errors)
            page.close()
        browser.close()
