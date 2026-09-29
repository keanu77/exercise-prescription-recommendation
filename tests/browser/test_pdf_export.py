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
import {createCoachingResponse} from './tests/helpers/coaching-fixture.mjs';
const cases=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases;
const result=i=>{const response=createCoachingResponse(cases[i].data);response.meta.model='test-only';response.meta.omittedItems=i===0?1:0;return response;};
console.log(JSON.stringify({normal:result(0),high:result(9),child:result(3),normalData:cases[0].data,highData:cases[9].data,childData:cases[3].data}));
"""],cwd=ROOT))


def compact(value):
    return re.sub(r'\s+', '', str(value))


def verify_pdf(path, report):
    assert path.read_bytes().startswith(b'%PDF-')
    assert 10000 < path.stat().st_size < 600000, path.stat().st_size
    extracted = subprocess.check_output(['pdftotext', '-layout', str(path), '-'], text=True)
    normalized = compact(extracted)
    raw_text = compact(subprocess.check_output(['pdftotext', '-raw', str(path), '-'], text=True))
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
                # Only long rows repeat their label inside a value. Removing every
                # label would also erase real prose such as the tracking label 身體反應.
                if len(str(_value)) > 1000:
                    flow = flow.replace(compact(label), '')
    flow = re.sub(r'\d+/\d+', '', flow)
    for text in expected:
        # Values were sanitized with cleanPDFText in the browser before returning.
        assert compact(text) in (flow if len(str(text)) > 1000 else normalized) or compact(text) in raw_text, f'{path.name}: missing text {str(text)[:100]}'
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
                    if '/assets/vendor/jspdf' in request.url or '/jspdf/' in request.url or '/html2canvas/' in request.url or '/assets/fonts/' in request.url else None)
            page.route('**/cdnjs.cloudflare.com/**', lambda route: route.abort())
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
            if not standalone:
                assert page.locator('#includeAiInPdf').count() == 0
                expect(page.locator('#downloadPrescription')).to_be_enabled()
                expect(page.locator('#downloadAiReport')).to_be_disabled()
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

            scenarios = ['standard', 'mobile', 'over45', 'moderate', 'high'] if standalone else ['standard', 'standard-ai-error', 'mobile', 'child', 'high', 'long', 'ai-report', 'ai-report-mobile', 'ai-report-child', 'ai-report-long', 'ai-consultation']
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
                      if (scenario === 'long') {
                        window.lastPrescription.progression = '長表格測試：' + '每次活動後記錄感受與恢復狀況。'.repeat(180) + '表格結束。';
                        window.lastPrescription.recommendations.push('長段落測試：' + '依計畫逐步活動並記錄身體反應。'.repeat(200) + '段落結束。');
                      }
                    }''', {'base': baseline, 'scenario': scenario, 'aiFixture': AI_FIXTURE['normal']})
                if scenario == 'standard-ai-error':
                    page.evaluate('setAIState("error")')
                    expect(page.locator('#downloadPrescription')).to_be_enabled()
                    expect(page.locator('#downloadAiReport')).to_be_disabled()
                ai_report = scenario.startswith('ai-report') or scenario == 'ai-consultation'
                export_button = button
                if ai_report:
                    profile = 'high' if scenario == 'ai-consultation' else 'child' if scenario == 'ai-report-child' else 'normal'
                    response = AI_FIXTURE[profile]
                    page.evaluate('''({data, long}) => {
                      window.lastFormData=data; window.lastPrescription=calculateFITTVP(data);
                      if(long) {
                        window.lastPrescription.progression='長表格測試：'+'每次活動後記錄感受與恢復狀況。'.repeat(180)+'表格結束。';
                        window.lastPrescription.recommendations.push('長段落測試：'+'依計畫逐步活動並記錄身體反應。'.repeat(200)+'段落結束。');
                      }
                    }''', {'data': AI_FIXTURE[profile+'Data'], 'long': scenario == 'ai-report-long'})
                    page.route('**/api/providers', lambda route: route.fulfill(json={'schemaVersion':2,'providers':[{'id':'groq','name':'Groq','models':[{'id':'openai/gpt-oss-120b','name':'GPT-OSS 120B','requiresKey':False,'status':'本站基準'}]}],'defaultProvider':'groq'}))
                    page.route('**/api/ai-recommendation', lambda route: route.fulfill(json=response))
                    page.evaluate('loadAICatalog()')
                    page.locator('#generateAiBtn').click()
                    expect(page.locator('#aiContent')).to_be_visible()
                    export_button = page.get_by_role('button', name='運動處方＆AI分析', exact=True)
                    expect(export_button).to_be_visible()
                    assert page.locator('#includeAiInPdf').count() == 0
                    if scenario == 'ai-report':
                        # Repeated AI exports share a guard and recover after load failure.
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
                  if(aiReport) {
                    const core=createPDFReport();
                    if(JSON.stringify(report.sections.slice(0,core.sections.length))!==JSON.stringify(core.sections) ||
                       JSON.stringify(report.notice)!==JSON.stringify(core.notice) || report.disclaimer!==core.disclaimer)
                      throw new Error('Combined PDF must retain the complete prescription and its safety notices');
                  }
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
                    assert '運動處方與AI行動報告' in text and 'test-only' in text
                    assert '先回答你的問題' in text and '如何回顧與下一步' in text
                    assert 'FITT-VP運動計畫' in text and '推薦運動範例' in text
                    assert text.index('FITT-VP運動計畫') < text.index(compact(report['disclaimer'])) < text.index('07AI行動建議')
                    pdf_pages = subprocess.check_output(['pdftotext', '-layout', str(target), '-'], text=True).split('\f')
                    ai_start = next(i for i, value in enumerate(pdf_pages) if '07AI行動建議' in compact(value))
                    assert ai_start >= 2 and '使用提醒' not in pdf_pages[ai_start], 'AI supplement starts on a separate page after clinical reminders'
                    if scenario == 'ai-report':
                        ai_standard_text = text
                        # A fresh user click can save again when automatic downloading is blocked.
                        expect(page.locator('#pdfSaveLink')).to_be_visible()
                        with page.expect_download(timeout=60000) as retry:
                            page.get_by_role('link', name='儲存 PDF', exact=True).click()
                        copy = OUT / f'{engine}-ai-manual-save.pdf'
                        retry.value.save_as(copy)
                        assert copy.read_bytes() == target.read_bytes()
                        assert page.locator('#pdfOpenLink').get_attribute('href').startswith('blob:')
                    elif scenario == 'ai-report-mobile':
                        assert text == ai_standard_text, 'Viewport changed AI report content'
                    elif scenario == 'ai-consultation':
                        assert '諮詢' in text and '需要留意的事' in text
                        assert '高風險' in text and '心率區間' not in text
                    elif scenario == 'ai-report-child':
                        assert '未滿18歲' in text and '每日身體活動' in text
                    elif scenario == 'ai-report-long':
                        assert count >= 6 and '表格結束。' in text and '段落結束。' in text
                if scenario == 'standard':
                    assert count == 2, count
                    standard_text = text
                if scenario == 'mobile':
                    assert count == 2 and text == standard_text, 'Viewport changed report content or pagination'
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
            if not standalone:
                page.evaluate('r=>{renderAIResult(r);setAIState("content");}', AI_FIXTURE['normal'])
                downloads=[]
                page.on('download', lambda item: downloads.append(item))
                page.evaluate('''() => {window.realPDFLoader=loadPDFLibraries;
                  window.loadPDFLibraries=()=>new Promise(resolve=>{window.finishPDFLoad=resolve;});}''')
                page.locator('#downloadAiReport').click()
                expect(page.locator('#downloadAiReport')).to_be_disabled()
                page.evaluate('resetAISection();window.finishPDFLoad()')
                expect(button).to_be_enabled()
                page.evaluate('window.loadPDFLibraries=window.realPDFLoader')
                assert not downloads, 'Clearing a report must discard pending PDF work'
                page.evaluate('resetAISection()')
                expect(page.locator('#downloadAiReport')).to_be_disabled()
                expect(page.locator('#pdfDownloadFeedback')).to_be_hidden()
                assert page.locator('#pdfSaveLink').get_attribute('href') is None
                # Optional AI edits must preserve an in-flight prescription export.
                page.evaluate('()=>{window.loadPDFLibraries=()=>new Promise(resolve=>window.finishPDFLoad=resolve);}')
                page.locator('#downloadPrescription').click()
                expect(page.locator('#downloadPrescription')).to_be_disabled()
                with page.expect_download(timeout=10000) as standard_done:
                    page.evaluate('resetAISection();window.finishPDFLoad()')
                saved = OUT / f'{engine}-prescription-during-ai-reset.pdf'
                standard_done.value.save_as(saved)
                assert saved.read_bytes().startswith(b'%PDF-')
                expect(page.locator('#downloadPrescription')).to_be_enabled()
                page.evaluate('window.loadPDFLibraries=window.realPDFLoader')
                # Clearing the health assessment still revokes both kinds of PDF.
                page.evaluate('()=>{lastFormData=null;lastPrescription=null;clearPDFDownload();resetAISection();}')
                expect(page.locator('#downloadPrescription')).to_be_disabled()
                assert page.locator('#pdfSaveLink').get_attribute('href') is None
            assert len(alerts) == (1 if standalone else 2) and not errors, (alerts, errors)
            page.close()
        browser.close()
