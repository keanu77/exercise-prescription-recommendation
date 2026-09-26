"""Reset/cancel, stale async responses, draft races and result reading order."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
OUT = Path('/private/tmp/exercise-ux-review')
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in [320, 390, 1280]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE, wait_until='networkidle')
        page.screenshot(path=str(OUT / f'home-{width}.png'), full_page=True)
        page.get_by_role('button', name='開始使用', exact=True).click()
        page.fill('#age', '35')
        page.select_option('#gender', 'male')
        page.fill('#height', '170.5')
        page.fill('#weight', '70.5')
        expect(page.locator('#draftStatus')).to_contain_text('已暫存')
        page.get_by_role('button', name='清除填寫資料', exact=True).click()
        dialog = page.get_by_role('dialog', name='清除這次填寫的資料？')
        expect(dialog).to_be_visible()
        expect(dialog.get_by_role('button', name='保留資料')).to_be_focused()
        page.keyboard.press('Escape')
        expect(dialog).not_to_be_visible()
        expect(page.locator('#age')).to_have_value('35')
        assert page.evaluate("JSON.parse(sessionStorage.getItem('exerciseRxFormDraft')).weight") == '70.5'
        page.get_by_role('button', name='清除填寫資料', exact=True).click()
        dialog.get_by_role('button', name='保留資料').click()
        expect(page.locator('#age')).to_have_value('35')

        page.evaluate('''() => {
          const pick = (name, value) => document.querySelector(`input[name="${name}"][value="${value}"]`).checked = true;
          pick('health_status', 'healthy'); pick('fitness_level', 'good');
          pick('exercise_habit', 'moderate'); pick('exercise_goal', 'health');
          for (let i=1; i<=7; i++) pick(`parq_q${i}`, 'no');
          generatePrescription(); showPage('resultPage');
        }''')
        assert page.locator('#prescriptionSummary').bounding_box()['y'] < page.locator('#aiRecommendationSection').bounding_box()['y']
        assert page.locator('.result-actions').bounding_box()['y'] < page.locator('#fittpDetails').bounding_box()['y']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        reference = page.locator('.reference-panel').first
        expect(reference).not_to_have_attribute('open', '')
        reference.locator('summary').focus()
        page.keyboard.press('Enter')
        expect(reference).to_have_attribute('open', '')
        page.keyboard.press('Enter')
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(OUT / f'result-{width}.png'), full_page=True)
        page.locator('#toggleAdvancedAI').click()
        page.select_option('#aiProviderSelect', 'groq')
        page.get_by_label('Groq API 金鑰').fill('TEST_ONLY_OWN_KEY')
        page.evaluate('''() => {
          window.fetch = (_url, options) => {
            window.pendingSignal = options.signal;
            return new Promise(resolve => { window.finishOldRequest = resolve; });
          };
        }''')
        page.locator('#aiConsent button').click()
        expect(page.locator('#aiLoading')).to_be_visible()
        # Schedule a form save immediately before reset, without waiting for debounce.
        page.evaluate('''() => {
          document.getElementById('age').dispatchEvent(new Event('input', {bubbles:true}));
          document.querySelector('.result-actions [data-clear-assessment]').click();
        }''')
        expect(dialog).to_be_visible()
        page.screenshot(path=str(OUT / f'clear-dialog-{width}.png'))
        dialog.get_by_role('button', name='清除並重新填寫').click()
        expect(page.locator('#formPage')).to_be_visible()
        expect(page.locator('#age')).to_be_focused()
        page.wait_for_timeout(220)
        state = page.evaluate('''() => ({
          draft: sessionStorage.getItem('exerciseRxFormDraft'),
          form: window.lastFormData, rx: window.lastPrescription,
          key: document.getElementById('customApiKey').value,
          checked: document.querySelectorAll('#healthForm input:checked').length,
          aborted: window.pendingSignal.aborted,
          metrics: ['bmiValue','bmrValue','tdeeValue'].map(id=>document.getElementById(id).textContent),
          result: ['prescriptionSummary','fittpDetails','exerciseGuidelines','aiContent'].map(id=>document.getElementById(id).textContent)
        })''')
        assert state['draft'] is None and state['form'] is None and state['rx'] is None, state
        assert not state['key'] and state['checked'] == 0 and state['aborted'], state
        assert state['metrics'] == ['待計算'] * 3 and state['result'] == [''] * 4, state
        expect(page.locator('#progressText')).to_have_text('0%')
        expect(page.locator('#draftStatus')).to_contain_text('已清除')
        expect(page.locator('#refreshAiBtn')).to_be_enabled()
        # Even an upstream implementation that ignores abort must not restore old content.
        page.evaluate('''() => window.finishOldRequest(new Response(JSON.stringify({success:true, recommendation:'<p>OLD_HEALTH_RESULT</p>'}), {headers:{'Content-Type':'application/json'}}))''')
        page.wait_for_timeout(100)
        expect(page.locator('#aiContent')).to_be_empty()
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='開始使用', exact=True).click()
        expect(page.locator('#age')).to_have_value('')
        expect(page.locator('#progressText')).to_have_text('0%')
        assert not errors, errors
        print(f'[OK] {width}px: reset/cancel/keyboard, draft and AI races, result order, no overflow')
        page.close()
    browser.close()
