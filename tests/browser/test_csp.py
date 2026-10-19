"""Verify response CSP enforcement and the pinned sanitizer in the real browser."""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for path in ['/', '/parq-form.html']:
        page = browser.new_page()
        response = page.goto(BASE + path, wait_until='networkidle')
        policy = response.headers['content-security-policy']
        assert "script-src-attr 'none'" in policy
        assert "'unsafe-inline'" not in policy.split('script-src ')[1].split(';')[0]
        assert page.locator('script:not([src])').count() == 0
        assert page.evaluate("[...document.querySelectorAll('*')].every(el=>[...el.attributes].every(a=>!/^on/i.test(a.name)))")
        if path == '/':
            assert page.evaluate('typeof ExerciseRules.calculateFITTVP') == 'function'
            assert page.evaluate('typeof renderAIResult') == 'function'
            assert page.locator('script[src*=purify]').count() == 0
        page.evaluate('''() => {
          window.cspViolations = [];
          document.addEventListener('securitypolicyviolation', e=>window.cspViolations.push(e.effectiveDirective));
          const script = document.createElement('script');
          script.textContent = 'window.inlineScriptExecuted = true';
          document.body.appendChild(script);
          const button = document.createElement('button');
          button.setAttribute('onclick', 'window.inlineHandlerExecuted = true');
          document.body.appendChild(button); button.click(); button.remove(); script.remove();
        }''')
        page.wait_for_function('window.cspViolations.length >= 2')
        assert page.evaluate('!window.inlineScriptExecuted && !window.inlineHandlerExecuted')
        violations = page.evaluate('window.cspViolations')
        assert 'script-src-attr' in violations and 'script-src-elem' in violations
        print(f'[OK] {path}: inline script/handler blocked; external app scripts loaded')
        page.close()
    browser.close()
