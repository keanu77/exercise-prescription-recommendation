"""Edge HTML errors retain retry guidance, abort category and no stale reports."""
import os,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ['BASE_URL']
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {readFileSync} from 'node:fs';
import {createCoachingResponse} from './tests/helpers/coaching-fixture.mjs';
import {publicCatalog} from './functions/_lib/models.js';
const data=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases[0].data;
console.log(JSON.stringify({data,result:createCoachingResponse(data),catalog:publicCatalog({GROQ_API_KEY:'fixture'})}));
"""],cwd=ROOT))
with sync_playwright() as p:
 for engine in os.environ.get('AI_BROWSERS','chromium').split(','):
  browser=getattr(p,engine).launch()
  page=browser.new_page(ignore_https_errors=BASE.startswith('https://127.0.0.1'))
  errors=[];calls=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/api/providers',lambda r:r.fulfill(json=fixture['catalog']))
  current={'status':503,'body':'<html>PRIVATE_RESPONSE<script>window.injected=true</script></html>','headers':{'Content-Type':'text/html','Retry-After':'2','CF-Ray':'0123456789abcdef-TPE'}}
  def handle(route):
   calls.append(route.request.post_data_json);route.fulfill(**current)
  page.route('**/api/ai-recommendation',handle)
  page.goto(BASE,wait_until='networkidle')
  page.evaluate('d=>{lastFormData=d;lastPrescription=calculateFITTVP(d);displayPrescriptionSummary(lastPrescription);showPage("resultPage");resetAISection();}',fixture['data'])
  page.locator('#generateAiBtn').click()
  expect(page.locator('#aiError')).to_be_visible()
  expect(page.locator('#aiRetryStatus')).to_contain_text('秒')
  expect(page.locator('#refreshAiBtn')).to_be_disabled()
  expect(page.locator('#aiErrorMessage')).to_contain_text('忙碌')
  expect(page.locator('#downloadPrescription')).to_be_enabled()
  expect(page.locator('#downloadAiReport')).to_be_disabled()
  page.locator('#aiErrorDetails summary').click()
  expect(page.locator('#aiErrorDiagnostic')).to_contain_text('HTTP 503')
  expect(page.locator('#aiErrorDiagnostic')).to_contain_text('0123456789abcdef-TPE')
  assert not page.evaluate('Boolean(window.injected)')
  assert 'PRIVATE_RESPONSE' not in page.locator('#aiError').inner_text()
  expect(page.locator('#refreshAiBtn')).to_be_enabled(timeout=4000)
  assert len(calls)==1,'An edge failure must not automatically resubmit private data or spend again'
  current.update(status=200,body=json.dumps(fixture['result']),headers={'Content-Type':'application/json'})
  page.locator('#refreshAiBtn').click();expect(page.locator('#aiContent')).to_be_visible()
  expect(page.locator('#aiErrorDetails')).to_be_hidden()
  assert len(calls)==2
  # Body read aborts must not be mislabeled as JSON errors
  page.evaluate('''()=>{window.originalFetch=window.fetch;window.fetch=async()=>({text:async()=>{throw new DOMException('Interrupted','AbortError');}});}''')
  page.locator('#refreshAiBtn').click();expect(page.locator('#aiErrorMessage')).to_contain_text('逾時')
  expect(page.locator('#downloadPrescription')).to_be_enabled()
  # A body that finishes after cancellation cannot restore a report or set cooldown
  page.evaluate('''()=>{window.fetch=async()=>({ok:false,status:503,headers:new Headers({'Retry-After':'3600'}),text:()=>new Promise(resolve=>window.finishBody=resolve)});}''')
  page.locator('#refreshAiBtn').click();expect(page.locator('#aiLoading')).to_be_visible()
  page.wait_for_function('typeof window.finishBody==="function"')
  page.locator('[data-action=cancelAIRecommendation]').click()
  page.evaluate('()=>window.finishBody("<html>late error</html>")')
  page.wait_for_timeout(50)
  expect(page.locator('#aiConsent')).to_be_visible();expect(page.locator('#generateAiBtn')).to_be_enabled()
  assert page.evaluate('lastAIResult===null && aiRetryUntil<=Date.now()')
  assert not errors,errors
  print('[OK]',engine,'HTML error, Retry-After, explicit retry, independent PDF availability, abort and stale body')
  browser.close()
