"""Personal coaching reports: consent, safe text, cancellation, retries, PDF and mobile."""
import os,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8765')
OUT=Path(os.environ.get('AI_OUTPUT_DIR',str(ROOT/'.claude/audit/ai-report-v2-20260927/screens')))
OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {readFileSync} from 'node:fs';
import {createCoachingResponse} from './tests/helpers/coaching-fixture.mjs';
import {publicCatalog} from './functions/_lib/models.js';
const cases=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases;
const result=i=>createCoachingResponse(cases[i].data);
console.log(JSON.stringify({catalog:publicCatalog({GROQ_API_KEY:'fixture'}),normal:result(0),high:result(9),data:cases[0].data}));
"""],cwd=ROOT))
with sync_playwright() as p:
 for engine in os.environ.get('AI_BROWSERS','chromium').split(','):
  browser=getattr(p,engine).launch()
  for width in [320,390,1280]:
   page=browser.new_page(viewport={'width':width,'height':900},ignore_https_errors=BASE.startswith('https://127.0.0.1'),reduced_motion='reduce')
   errors=[];calls=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   page.route('**/api/providers',lambda route:route.fulfill(json=fixture['catalog']))
   current={'response':fixture['normal'],'status':200,'headers':{}}
   def handler(route):
    calls.append(route.request.post_data_json)
    route.fulfill(status=current['status'],json=current['response'],headers=current['headers'])
   page.route('**/api/ai-recommendation',handler)
   page.goto(BASE,wait_until='networkidle')
   page.evaluate('''data=>{window.lastFormData=data;window.lastPrescription=calculateFITTVP(data);displayPrescriptionSummary(window.lastPrescription);showPage('resultPage');resetAISection();}''',fixture['data'])
   expect(page.locator('#aiConsent')).to_be_visible();assert not calls
   expect(page.locator('#downloadAiReport')).to_be_visible();expect(page.locator('#downloadAiReport')).to_be_disabled()
   assert page.locator('#aiProviderSelect option').evaluate_all('(els)=>els.map(el=>el.value)')==['auto','groq']
   expect(page.locator('#aiDestination')).to_contain_text('Groq')
   page.locator('#generateAiBtn').click()
   expect(page.locator('#aiContent')).to_be_visible()
   assert len(calls)==1 and calls[0]['schemaVersion']==3 and 'prescription' not in calls[0]['userData']
   assert calls[0]['provider']=='groq' and calls[0]['model']=='openai/gpt-oss-120b', 'Pin the provider shown before consent'
   assert page.locator('[data-report-section]').count()==6
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   expect(page.locator('#downloadAiReport')).to_be_visible()
   assert page.evaluate('createAIPDFReport().sections.find(s=>s.appendix).items[0]')==fixture['normal']['report']['summary']
   assert page.evaluate('JSON.stringify(createAIPDFReport().sections.slice(0,6))===JSON.stringify(createPDFReport().sections)')
   expect(page.locator('#aiDownloadHint')).to_contain_text('完整運動處方')
   assert page.locator('#downloadPrescription, #includeAiInPdf, #aiPdfOption').count()==0
   assert page.locator('.ai-report-section').count()==6
   assert page.locator('.result-shell > :last-child').get_attribute('class')=='report-download-panel'
   ai=page.locator('#downloadAiReport').bounding_box(); reference=page.locator('.reference-panel').last.bounding_box()
   assert ai['y']>=reference['y']+reference['height']
   page.locator('.report-download-panel').screenshot(path=str(OUT/f'{engine}-{width}-download.png'))
   expect(page.locator('#downloadAiReport')).to_be_enabled()
   page.locator('#aiRecommendationSection').screenshot(path=str(OUT/f'{engine}-{width}-normal.png'))
   partial=json.loads(json.dumps(fixture['normal']));partial['meta']['omittedItems']=1
   current['response']=partial;page.locator('#refreshAiBtn').click()
   expect(page.locator('[data-ai-omission-notice]')).to_contain_text('部分 AI 建議未能完整整理')
   assert page.evaluate("createAIPDFReport().sections.find(s=>s.appendix).items.some(v=>v.includes('部分 AI 建議未能完整整理'))")
   current['response']=fixture['high'];page.locator('#refreshAiBtn').click()
   expect(page.locator('.action-safety')).to_be_visible()
   expect(page.locator('[data-report-section=plan]')).to_contain_text('諮詢')
   page.locator('#aiRecommendationSection').screenshot(path=str(OUT/f'{engine}-{width}-consult.png'))
   current['response']={'success':True,'schemaVersion':3,'recommendation':'<script>window.injection=true</script>'}
   page.locator('#refreshAiBtn').click();expect(page.locator('#aiError')).to_be_visible()
   assert page.evaluate('!window.injection && lastAIResult===null')
   assert page.evaluate('()=>{try{createAIPDFReport();return false;}catch{return true;}}')
   # Even a hostile same-origin text fixture is rendered as text, never HTML.
   evil=json.loads(json.dumps(fixture['normal']));evil['report']['summary']='<img src=x onerror="window.injection=true">'
   current['response']=evil;page.locator('#refreshAiBtn').click()
   expect(page.locator('#aiContent')).to_contain_text('<img src=x')
   assert page.locator('#aiContent img').count()==0
   current.update(response={'success':False,'error':'請稍後再試'},status=429,headers={'Retry-After':'1'})
   page.locator('#refreshAiBtn').click();expect(page.locator('#refreshAiBtn')).to_be_disabled()
   expect(page.locator('#aiRetryStatus')).to_contain_text('秒')
   expect(page.locator('#refreshAiBtn')).to_be_enabled(timeout=3000)
   page.evaluate('resetAISection()')
   # Deliberately ignore AbortSignal to prove stale completions stay discarded.
   page.evaluate('''()=>{window.originalFetch=window.fetch; window.fetch=(url,options)=>new Promise(resolve=>{window.pendingSignal=options.signal;window.finishOld=resolve;});}''')
   page.locator('#generateAiBtn').click();expect(page.locator('#aiLoading')).to_be_visible()
   expect(page.locator('#downloadAiReport')).to_be_visible();expect(page.locator('#downloadAiReport')).to_be_disabled()
   page.get_by_role('button',name='取消等待').click();expect(page.locator('#aiConsent')).to_be_visible()
   assert page.evaluate('window.pendingSignal.aborted')
   page.evaluate('r=>window.finishOld(new Response(JSON.stringify(r)))',fixture['normal'])
   page.wait_for_timeout(100);expect(page.locator('#aiContent')).to_be_empty()
   page.evaluate('window.fetch=window.originalFetch')
   page.locator('#toggleAdvancedAI').click();page.select_option('#aiProviderSelect','groq')
   expect(page.locator('#aiDestination')).to_contain_text('Groq')
   page.locator('#customApiKey').fill('fake-key')
   page.select_option('#aiProviderSelect','auto');expect(page.locator('#customApiKey')).to_have_value('')
   page.select_option('#aiProviderSelect','groq')
   assert page.locator('#modelSelect option').first.get_attribute('value')=='openai/gpt-oss-120b'
   page.select_option('#modelSelect','openai/gpt-oss-20b')
   expect(page.locator('#aiDestination')).to_contain_text('需提供自己的金鑰')
   page.locator('#advancedAISettings').screenshot(path=str(OUT/f'{engine}-{width}-groq-settings.png'))
   # Daily site budget must allow a genuine BYOK retry while IP limits stay global.
   page.select_option('#aiProviderSelect','auto')
   current.update(response={'success':False,'retryScope':'site','error':'今日站方額度已用完'},status=503,headers={'Retry-After':'3600'})
   page.locator('#generateAiBtn').click();expect(page.locator('#refreshAiBtn')).to_be_disabled()
   page.select_option('#aiProviderSelect','groq');page.locator('#customApiKey').fill('fixture-own-key')
   expect(page.locator('#refreshAiBtn')).to_be_enabled()
   current.update(response=fixture['normal'],status=200,headers={})
   page.locator('#refreshAiBtn').click();expect(page.locator('#aiContent')).to_be_visible()
   assert calls[-1]['customApiKey']=='fixture-own-key'
   assert not errors,errors
   print(f'[OK] {engine}/{width}: consent, six report sections, consultation, PDF selection, malformed output, XSS, 429, cancel/stale, catalog')
   page.close()
  browser.close()
