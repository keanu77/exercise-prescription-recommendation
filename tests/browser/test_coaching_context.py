"""Context consent, validation and report/PDF invalidation across async races."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8765')
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {readFileSync} from 'node:fs';
import {publicCatalog} from './functions/_lib/models.js';
import {createCoachingResponse} from './tests/helpers/coaching-fixture.mjs';
const data=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases[0].data;
console.log(JSON.stringify({data,catalog:publicCatalog({GROQ_API_KEY:'fixture'}),report:createCoachingResponse(data)}));
"""],cwd=ROOT))

with sync_playwright() as p:
 for engine in os.environ.get('AI_BROWSERS','chromium').split(','):
  browser=getattr(p,engine).launch()
  page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce',ignore_https_errors=BASE.startswith('https://127.0.0.1'))
  calls=[]
  page.route('**/api/providers',lambda route:route.fulfill(json=fixture['catalog']))
  page.route('**/api/ai-recommendation',lambda route:(calls.append(route.request.post_data_json),route.fulfill(json=fixture['report'])))
  page.goto(BASE,wait_until='networkidle')
  page.evaluate("d=>{lastFormData=d;lastPrescription=calculateFITTVP(d);displayPrescriptionSummary(lastPrescription);showPage('resultPage');resetAISection();}",fixture['data'])
  question=page.get_by_label('你最想解決的問題')
  expect(question).to_be_visible()
  question.fill('下班常被加班打斷，想在家開始，怎麼安排比較能持續？')
  for day in ['mon','sat']:
   page.locator(f'input[name="aiDays"][value="{day}"]').check()
  page.select_option('#aiSessionMinutes','20')
  page.select_option('#aiTimeOfDay','evening')
  page.select_option('#aiSetting','home')
  # "None" stays mutually exclusive in either selection order
  page.locator('input[name="aiEquipment"][value="bands"]').check()
  page.locator('input[name="aiEquipment"][value="none"]').check()
  expect(page.locator('input[name="aiEquipment"][value="bands"]')).not_to_be_checked()
  page.locator('input[name="aiEquipment"][value="bands"]').check()
  expect(page.locator('input[name="aiEquipment"][value="none"]')).not_to_be_checked()
  for activity in ['strength','walking','running','cycling']:
   page.locator(f'input[name="aiPreferences"][value="{activity}"]').check()
  page.get_by_role('button',name='產生我的行動建議',exact=True).click()
  expect(page.locator('#aiContextError')).to_contain_text('最多選 3 項')
  assert not calls, 'Invalid preference count must not transmit health data'
  for activity in ['walking','running','cycling']:
   page.locator(f'input[name="aiPreferences"][value="{activity}"]').uncheck()
  page.get_by_role('button',name='產生我的行動建議',exact=True).click()
  expect(page.locator('#aiContent')).to_be_visible()
  assert len(calls)==1 and calls[0]['schemaVersion']==3
  c=calls[0]['coachingContext']
  assert c['availableDays']==['mon','sat'] and c['sessionMinutes']==20 and c['setting']=='home'
  assert c['equipment']==['bands'] and c['preferences']==['strength'] and '加班' in c['question']
  assert 'coachingContext' not in json.loads(page.evaluate('sessionStorage.getItem("exerciseRxFormDraft")') or '{}')
  assert not page.locator('#aiContextPanel').evaluate('(el)=>el.open'), 'Completed report is visible without scrolling past the form'
  expect(page.locator('#downloadAiReport')).to_be_enabled()
  page.locator('#aiContextPanel summary').click()
  question.fill('下雨時如何維持安排？')
  expect(page.locator('#downloadAiReport')).to_be_disabled()
  assert page.evaluate('lastAIResult===null')
  expect(page.locator('#aiContent')).to_be_empty()
  # An in-flight completion for the old context cannot restore a stale PDF
  page.evaluate('''()=>{window.originalFetch=window.fetch;
    window.fetch=(url,options)=>new Promise(resolve=>{window.pendingSignal=options.signal;window.finishOld=resolve;});}''')
  page.get_by_role('button',name='產生我的行動建議',exact=True).click()
  expect(page.locator('#aiLoading')).to_be_visible()
  page.get_by_role('button',name='取消等待',exact=True).click()
  expect(question).to_have_value('下雨時如何維持安排？')
  assert page.evaluate('window.pendingSignal.aborted')
  assert page.locator('input[name="aiDays"]:checked').count()==2
  expect(page.locator('#aiSessionMinutes')).to_have_value('20')
  page.evaluate('r=>window.finishOld(new Response(JSON.stringify(r)))',fixture['report'])
  page.wait_for_timeout(100)
  expect(page.locator('#aiContent')).to_be_empty()
  page.get_by_role('button',name='產生我的行動建議',exact=True).click()
  expect(page.locator('#aiLoading')).to_be_visible()
  question.fill('改成早上安排是否比較可行？')
  assert page.evaluate('window.pendingSignal.aborted')
  page.evaluate('r=>window.finishOld(new Response(JSON.stringify(r)))',fixture['report'])
  page.wait_for_timeout(100)
  expect(page.locator('#aiContent')).to_be_empty()
  expect(page.locator('#downloadAiReport')).to_be_disabled()
  page.evaluate('window.fetch=window.originalFetch')
  expect(question).to_have_value('改成早上安排是否比較可行？')
  page.evaluate('clearAssessment()')
  expect(question).to_have_value('')
  assert page.locator('#aiContextFields input:checked').count()==0
  print(f'[OK] {engine}: optional consent, limits, equipment, context edit aborts stale report/PDF, clear')
  browser.close()
