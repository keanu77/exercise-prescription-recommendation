"""PDF concurrency, failure recovery and actual downloads under deployment CSP."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
OUT = Path('/private/tmp/exercise-ux-review')
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for standalone in [False, True]:
        page = browser.new_page(accept_downloads=True)
        errors, alerts, library_requests = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: (alerts.append(dialog.message), dialog.dismiss()))
        page.on('request', lambda request: library_requests.append(request.url)
                if '/jspdf/' in request.url or '/html2canvas/' in request.url else None)
        page.goto(BASE + ('/parq-form.html' if standalone else '/'), wait_until='networkidle')
        page.get_by_role('button', name='開始評估' if standalone else '開始使用', exact=True).click()
        page.fill('#age', '35')
        page.select_option('#gender', 'male')
        page.fill('#height', '170.5')
        page.fill('#weight', '70.5')
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
        # First attempt stays pending, then fails. A duplicate invocation must do no work.
        page.evaluate('''() => {
          window.realPDFLoader = loadPDFLibraries;
          window.loadCount = 0;
          window.loadPDFLibraries = () => {
            window.loadCount++;
            return new Promise((_resolve, reject) => { window.failPDFLoad = reject; });
          };
        }''')
        button.click()
        expect(button).to_be_disabled()
        page.evaluate('downloadPDF()')
        assert page.evaluate('window.loadCount') == 1
        page.evaluate("window.failPDFLoad(new Error('mock PDF failure'))")
        expect(button).to_be_enabled()
        assert len(alerts) == 1, alerts
        assert page.locator('#pdfLoadingStatus, #pdfExportContent, #loadingModal.active').count() == 0

        # Real CDN/SRI downloads: concurrent requests share the two library loads.
        state = page.evaluate('''async () => {
          window.loadPDFLibraries = window.realPDFLoader;
          const first = loadPDFLibraries();
          const second = loadPDFLibraries();
          const same = first === second;
          await Promise.all([first, second]);
          return {same, ready: !!window.jspdf?.jsPDF && typeof html2canvas === 'function'};
        }''')
        assert state['same'] and state['ready'], state
        assert len(library_requests) == 2, library_requests
        await_fonts = page.evaluate('document.fonts.ready.then(() => true)')
        with page.expect_download(timeout=60000) as event:
            button.click()
        download = event.value
        target = OUT / ('parq-report.pdf' if standalone else 'exercise-prescription.pdf')
        download.save_as(target)
        data = target.read_bytes()
        assert data.startswith(b'%PDF-') and len(data) > 10000
        assert download.failure() is None
        expect(button).to_be_enabled()
        assert page.locator('#pdfLoadingStatus, #pdfExportContent, #loadingModal.active').count() == 0
        assert len(library_requests) == 2, 'Export must reuse the loaded libraries'
        assert len(alerts) == 1 and not errors, (alerts, errors)
        print(f'[OK] {target.name}: real PDF {len(data)} bytes; concurrent load, duplicate click and failure retry')
        page.close()
    browser.close()
