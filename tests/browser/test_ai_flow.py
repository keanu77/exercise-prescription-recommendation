"""Structured action cards: consent, safe text, cancellation, retries, PDF and mobile."""
import os,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8765')
OUT=ROOT/'.claude/audit/ai-redesign-20260927/screens'
OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {readFileSync} from 'node:fs';
import {validateUserData} from './functions/_lib/ai.js';
import {buildAdviceContext,presentAdvice,RULES_VERSION,PROMPT_VERSION} from './functions/_lib/advice.js';
import {publicCatalog} from './functions/_lib/models.js';
const cases=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases;
const result=i=>{const ctx=buildAdviceContext(validateUserData(cases[i].data).data);return {success:true,schemaVersion:2,...presentAdvice(Object.fromEntries(Object.entries(ctx.catalog).map(([k,v])=>[k,Object.keys(v).slice(0,2)])),ctx),meta:{provider:'groq',model:'openai/gpt-oss-120b',rulesVersion:RULES_VERSION,promptVersion:PROMPT_VERSION,generatedAt:new Date().toISOString()}}};
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
   expect(page.locator('#aiDestination')).to_contain_text('Groq')
   page.locator('#generateAiBtn').click()
   expect(page.locator('#aiContent')).to_be_visible()
   assert len(calls)==1 and calls[0]['schemaVersion']==2 and 'prescription' not in calls[0]['userData']
   assert calls[0]['provider']=='groq' and calls[0]['model']=='openai/gpt-oss-120b', 'Pin the provider shown before consent'
   assert page.locator('.action-item').count()==3
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.evaluate('aiPDFSections().length')==0
   page.locator('#includeAiInPdf').check()
   assert page.evaluate('aiPDFSections().length')==5
   page.locator('#aiRecommendationSection').screenshot(path=str(OUT/f'{engine}-{width}-normal.png'))
   current['response']=fixture['high'];page.locator('#refreshAiBtn').click()
   expect(page.locator('.action-item h4').first).to_have_text('就醫前整理')
   expect(page.locator('#includeAiInPdf')).not_to_be_checked()
   page.locator('#aiRecommendationSection').screenshot(path=str(OUT/f'{engine}-{width}-consult.png'))
   current['response']={'success':True,'schemaVersion':2,'recommendation':'<script>window.injection=true</script>'}
   page.locator('#refreshAiBtn').click();expect(page.locator('#aiError')).to_be_visible()
   assert page.evaluate('!window.injection && lastAIResult===null')
   expect(page.locator('#aiPdfOption')).to_be_hidden()
   # Even a hostile same-origin text fixture is rendered as text, never HTML.
   evil=json.loads(json.dumps(fixture['normal']));evil['advice']['summary']='<img src=x onerror="window.injection=true">'
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
   page.get_by_role('button',name='取消等待').click();expect(page.locator('#aiConsent')).to_be_visible()
   assert page.evaluate('window.pendingSignal.aborted')
   page.evaluate('r=>window.finishOld(new Response(JSON.stringify(r)))',fixture['normal'])
   page.wait_for_timeout(100);expect(page.locator('#aiContent')).to_be_empty()
   page.evaluate('window.fetch=window.originalFetch')
   page.locator('#toggleAdvancedAI').click();page.select_option('#aiProviderSelect','openai')
   expect(page.locator('#aiDestination')).to_contain_text('OpenAI')
   page.locator('#customApiKey').fill('fake-key')
   page.select_option('#aiProviderSelect','gemini');expect(page.locator('#customApiKey')).to_have_value('')
   assert page.locator('#modelSelect option').first.get_attribute('value')=='gemini-3.8-flash'
   assert not errors,errors
   print(f'[OK] {engine}/{width}: consent, cards, consultation, PDF selection, malformed output, XSS, 429, cancel/stale, catalog')
   page.close()
  browser.close()
