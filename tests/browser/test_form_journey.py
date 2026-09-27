"""Real form interactions: decimal inputs, validation recovery, keyboard and mobile."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
OUT = Path('/private/tmp/exercise-site-audit')
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in [320, 390, 1280]:
        page = browser.new_page(viewport={'width': width, 'height': 844}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'not focusable' in m.text else None)
        page.goto(BASE, wait_until='networkidle')
        assert page.locator('#healthForm .form-step').count() == 3
        start = page.get_by_role('button', name='開始使用', exact=True)
        box = start.bounding_box()
        assert box['y'] + box['height'] < 844, 'Start action should fit the first viewport'
        if width == 390:
            page.screenshot(path=str(OUT / 'home-after.png'), full_page=True)
        start.click()
        next_button = page.locator('.form-step.active').get_by_role('button', name='下一步')
        page.fill('#age', '5')
        page.select_option('#gender', 'male')
        page.fill('#height', '170.5')
        page.fill('#weight', '70.5')
        next_button.click()
        expect(page.locator('#age')).to_be_focused()
        expect(page.locator('.form-step.active')).to_have_attribute('data-step', '1')
        expect(page.locator('#formError')).to_contain_text('年齡需介於')
        page.fill('#age', '35.5')
        next_button.click()
        expect(page.locator('#formError')).to_contain_text('整數')
        page.fill('#age', '35')
        page.locator('#age').press('Enter')
        expect(page.locator('.form-step.active')).to_have_attribute('data-step', '2')
        page.locator('input[name="health_status"][value="healthy"]').check()
        page.locator('input[name="fitness_level"][value="good"]').check()
        page.locator('.form-step.active').get_by_role('button', name='下一步').click()
        for i in range(1, 8):
            page.locator(f'input[name="parq_q{i}"][value="no"]').check()
        expect(page.locator('#progressText')).to_have_text('87%')
        expect(page.locator('#progressTrack')).to_have_attribute('aria-valuenow', '87')
        assert page.evaluate("JSON.parse(sessionStorage.getItem('exerciseRxFormDraft')).parq_q7") == 'no'
        page.locator('button[type="submit"]').click()
        expect(page.locator('#formError')).to_contain_text('運動習慣')
        page.locator('input[name="exercise_habit"][value="moderate"]').check()
        page.locator('button[type="submit"]').click()
        expect(page.locator('#formError')).to_contain_text('運動目標')
        page.locator('input[name="exercise_goal"][value="health"]').check()
        expect(page.locator('#progressText')).to_have_text('100%')
        expect(page.locator('#progressTrack')).to_have_attribute('aria-valuenow', '100')
        # A reload should restore both later steps as well as the measurements.
        if width == 390:
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='開始使用', exact=True).click()
            expect(page.locator('#progressText')).to_have_text('100%')
            next_button.click()
            page.locator('.form-step.active').get_by_role('button', name='下一步').click()
            expect(page.locator('input[name="parq_q7"][value="no"]')).to_be_checked()
        page.locator('#height').evaluate('(el) => el.value = 99')
        page.locator('button[type="submit"]').click()
        expect(page.locator('.form-step.active')).to_have_attribute('data-step', '1')
        expect(page.locator('#height')).to_be_focused()
        page.fill('#height', '170.5')
        page.locator('#weight').focus()
        assert page.locator('#weight').evaluate('(el) => getComputedStyle(el).outlineStyle') != 'none'
        next_button.click()
        page.locator('.form-step.active').get_by_role('button', name='下一步').click()
        page.locator('button[type="submit"]').click()
        expect(page.locator('#resultPage')).to_be_visible()
        assert page.evaluate('window.lastFormData.weight') == 70.5
        assert page.evaluate('window.lastFormData.height') == 170.5
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        expect(page.locator('#aiConsent')).to_be_visible()
        page.locator('#toggleAdvancedAI').click()
        expect(page.locator('#toggleAdvancedAI')).to_have_attribute('aria-expanded', 'true')
        page.get_by_label('Groq 使用方式').select_option('groq')
        expect(page.get_by_label('選擇模型')).to_be_visible()
        expect(page.get_by_label('Groq API 金鑰')).to_be_visible()
        page.locator('#toggleAdvancedAI').click()
        expect(page.locator('#toggleAdvancedAI')).to_have_attribute('aria-expanded', 'false')
        if width == 390:
            page.screenshot(path=str(OUT / 'result-after.png'), full_page=True)
        assert not errors, errors
        print(f'[OK] {width}px: decimal form, errors, progress, keyboard, result, AI labels')
        page.close()
    browser.close()
