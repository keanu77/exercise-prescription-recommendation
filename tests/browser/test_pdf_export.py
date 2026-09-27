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

ROOT = Path(__file__).resolve().parents[2]
AI_FIXTURE = json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {readFileSync} from 'node:fs';
import {validateUserData} from './functions/_lib/ai.js';
import {buildAdviceContext,presentAdvice,RULES_VERSION,PROMPT_VERSION} from './functions/_lib/advice.js';
const cases=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases;
const result=i=>{const ctx=buildAdviceContext(validateUserData(cases[i].data).data);return {success:true,schemaVersion:2,...presentAdvice(Object.fromEntries(Object.entries(ctx.catalog).map(([k,v])=>[k,Object.keys(v).slice(0,2)])),ctx),meta:{provider:'groq',model:'test-only',generatedAt:'2026-09-27T00:00:00Z',rulesVersion:RULES_VERSION,promptVersion:PROMPT_VERSION}}};
console.log(JSON.stringify({normal:result(0),high:result(9)}));
"""],cwd=ROOT))


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

            scenarios = ['standard', 'mobile', 'over45', 'moderate', 'high'] if standalone else ['standard', 'mobile', 'child', 'high', 'long', 'ai-appendix', 'ai-report', 'ai-report-mobile', 'ai-consultation']
            baseline = page.evaluate('JSON.parse(JSON.stringify(basicInfo))' if standalone else 'JSON.parse(JSON.stringify(window.lastFormData))')
            standard_text = None
            for scenario in scenarios:
                page.set_viewport_size({'width': 390 if scenario in ['mobile','ai-report-mobile'] else 1440, 'height': 1000})
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
                    page.evaluate('''({base, scenario, aiFixture}) => {
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
                        lastAIResult=aiFixture;
                        document.getElementById('includeAiInPdf').checked=true;
                      }
                      if (scenario === 'long') {
                        window.lastPrescription.progression = '長表格測試：' + '每次活動後記錄感受與恢復狀況。'.repeat(180) + '表格結束。';
                        window.lastPrescription.recommendations.push('長段落測試：' + '依計畫逐步活動並記錄身體反應。'.repeat(200) + '段落結束。');
                      }
                    }''', {'base': baseline, 'scenario': scenario, 'aiFixture': AI_FIXTURE['normal']})
                ai_report = scenario.startswith('ai-report') or scenario == 'ai-consultation'
                export_button = button
                if ai_report:
                    response = AI_FIXTURE['high' if scenario == 'ai-consultation' else 'normal']
                    page.route('**/api/providers', lambda route: route.fulfill(json={'schemaVersion':2,'providers':[{'id':'groq','name':'Groq','models':[{'id':'openai/gpt-oss-120b','name':'GPT-OSS 120B','requiresKey':False,'status':'本站基準'}]}],'defaultProvider':'groq'}))
                    page.route('**/api/ai-recommendation', lambda route: route.fulfill(json=response))
                    page.evaluate('loadAICatalog()')
                    page.locator('#generateAiBtn').click()
                    expect(page.locator('#aiContent')).to_be_visible()
                    export_button = page.get_by_role('button', name='下載 AI 報告 PDF', exact=True)
                    expect(export_button).to_be_visible()
                    expect(page.locator('#includeAiInPdf')).not_to_be_checked()
                    if scenario == 'ai-report':
                        # Both export entry points share a guard and recover after load failure.
                        page.evaluate('''() => { window.realPDFLoader=loadPDFLibraries; window.loadCount=0;
                          window.loadPDFLibraries=()=>{window.loadCount++;return new Promise((_ok,reject)=>{window.failPDFLoad=reject;});}; }''')
                        export_button.click(); expect(export_button).to_be_disabled(); expect(button).to_be_disabled()
                        page.evaluate('downloadAIPDF();downloadPDF()')
                        assert page.evaluate('window.loadCount') == 1
                        page.evaluate("window.failPDFLoad(new Error('mock AI PDF failure'))")
                        expect(export_button).to_be_enabled(); expect(button).to_be_enabled()
                        page.evaluate('window.loadPDFLibraries=window.realPDFLoader')
                        assert len(alerts) == 2
                report = page.evaluate('''aiReport => {
                  const report = aiReport ? createAIPDFReport() : createPDFReport();
                  report.sections.forEach(s => s.items = s.items.map(i => Array.isArray(i) ? i.map(cleanPDFText) : cleanPDFText(i)));
                  return report;
                }''', ai_report)
                with page.expect_download(timeout=60000) as event:
                    export_button.click()
                target = OUT / f'{engine}-{"parq" if standalone else "exercise"}-{scenario}.pdf'
                event.value.save_as(target)
                assert event.value.failure() is None
                count, text = verify_pdf(target, report)
                if ai_report:
                    assert event.value.suggested_filename.startswith('AI運動行動報告_')
                    assert 'AI運動行動報告' in text and 'test-only' in text
                    assert 'FITT-VP運動計畫' not in text, 'Standalone AI report should not depend on appendix checkbox'
                    if scenario == 'ai-report':
                        ai_standard_text = text
                    elif scenario == 'ai-report-mobile':
                        assert text == ai_standard_text, 'Viewport changed AI report content'
                    else:
                        assert '就醫前整理' in text and '帶去詢問的問題' in text
                if scenario == 'standard':
                    assert count == 2, count
                    standard_text = text
                if scenario == 'mobile':
                    assert count == 2 and text == standard_text, 'Viewport changed report content or pagination'
                if scenario == 'ai-appendix':
                    assert count == 3 and 'AI協助選取的生活行動' in text and 'test-only' in text
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
            assert len(alerts) == (1 if standalone else 2) and not errors, (alerts, errors)
            page.close()
        browser.close()
