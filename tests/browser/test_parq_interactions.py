"""Standalone PAR-Q user flows; start the local server before running.

BASE_URL=http://127.0.0.1:8765 PYTHONPATH=~/Library/Python/3.9/lib/python/site-packages \
  /usr/bin/python3 tests/browser/test_parq_interactions.py
"""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8765").rstrip("/")
fails = 0


def ok(condition, name, details=""):
    global fails
    print(f"[{'OK ' if condition else 'FAIL'}] {name} {details}")
    if not condition:
        fails += 1


def metrics(page):
    return page.evaluate("""() => ({
      bmi: document.getElementById('bmiValue').textContent,
      bmr: document.getElementById('bmrValue').textContent,
      tdee: document.getElementById('tdeeValue').textContent,
      adviceHidden: document.getElementById('calorieAdvice').classList.contains('hidden')
    })""")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    alerts = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def dismiss_dialog(dialog):
        alerts.append(dialog.message)
        dialog.dismiss()

    page.on("dialog", dismiss_dialog)
    page.goto(BASE + "/parq-form.html")
    ok(page.evaluate("document.activeElement === document.body"),
       "initial load does not steal focus")
    page.get_by_role("button", name="開始評估", exact=True).click()
    ok("基本資料" in page.title() and page.evaluate(
        "document.activeElement === document.querySelector('#basicInfoPage h2')"),
        "basic-info navigation updates title and heading focus")

    page.fill("#age", "35")
    page.select_option("#gender", "male")
    page.fill("#height", "170.5")
    page.fill("#weight", "70.5")
    state = metrics(page)
    ok(state["bmr"] == "1601" and state["tdee"] == "2201" and not state["adviceHidden"],
       "decimal measurements calculate without rounding the inputs", state)

    # Every incomplete or invalid numeric field immediately invalidates calories.
    for selector, original in [("#age", "35"), ("#height", "170.5"), ("#weight", "70.5")]:
        page.fill(selector, "")
        state = metrics(page)
        ok(state["bmr"] == "待計算" and state["tdee"] == "待計算" and state["adviceHidden"],
           f"clearing {selector} clears stale calories", state)
        if selector != "#age":
            ok(state["bmi"] == "待計算", f"clearing {selector} clears BMI")
        page.fill(selector, original)
    page.select_option("#gender", "")
    state = metrics(page)
    ok(state["bmr"] == "待計算" and state["tdee"] == "待計算" and state["adviceHidden"],
       "clearing gender clears stale calories", state)
    page.select_option("#gender", "male")
    for selector, invalid, original in [
        ("#age", "200", "35"), ("#age", "35.5", "35"),
        ("#height", "119", "170.5"), ("#weight", "301", "70.5"),
    ]:
        page.fill(selector, invalid)
        state = metrics(page)
        ok(state["bmr"] == "待計算" and state["tdee"] == "待計算" and state["adviceHidden"],
           f"invalid {selector}={invalid} does not produce calories", state)
        page.fill(selector, original)

    page.get_by_role("button", name="進入 PAR-Q+ 問卷 →", exact=True).click()
    ok(page.locator("#parqPage").is_visible() and not alerts,
       "decimal inputs complete native navigation", alerts)
    ok("健康篩檢問題" in page.title() and page.evaluate(
        "document.activeElement === document.querySelector('#parqPage h2')"),
        "question navigation updates title and heading focus")
    ok(page.get_by_role("radiogroup").count() == 7 and
       page.get_by_role("radiogroup", name="1. 您的醫師是否曾告訴您，您患有心臟病或高血壓？").count() == 1,
       "questions have accessible group names")

    # Use native keyboard selection, including an arrow-key change after selection.
    for question in range(1, 8):
        radio = page.locator(f'input[name="q{question}"][value="no"]')
        radio.focus()
        radio.press("Space")
    page.locator('input[name="q2"][value="no"]').press("ArrowLeft")
    ok(page.locator('input[name="q2"][value="yes"]').is_checked() and
       page.evaluate("parqAnswers.q2 === 'yes'"),
       "keyboard arrow change synchronizes answer state")
    page.get_by_role("button", name="完成評估並查看結果 →", exact=True).click()
    ok(page.locator("#resultPage").is_visible() and "高風險" in page.locator("#riskAssessment").inner_text(),
       "keyboard answers drive the existing risk assessment")
    ok("評估結果" in page.title() and page.evaluate(
        "document.activeElement === document.querySelector('#resultPage h2')"),
        "result navigation updates title and heading focus")

    # Script download errors must not leave a rejected cache entry or broken node.
    attempts = {"count": 0}

    def serve_retry_script(route):
        attempts["count"] += 1
        if attempts["count"] == 1:
            route.abort("failed")
        else:
            route.fulfill(status=200, content_type="application/javascript",
                          body="window.__pdfRetryScriptLoaded = true;")

    page.route("**/pdf-retry-test.js", serve_retry_script)
    state = page.evaluate("""async () => {
      const src = new URL('/pdf-retry-test.js', location.href).href;
      let rejected = false;
      try { await loadScript(src, ''); } catch { rejected = true; }
      const failedNodeRemoved = ![...document.scripts].some(script => script.src === src);
      await loadScript(src, '');
      return {rejected, failedNodeRemoved, retried: window.__pdfRetryScriptLoaded === true};
    }""")
    ok(all(state.values()) and attempts["count"] == 2, "PDF script loader recovers on retry", state)

    # Exercise the real download lifecycle with failures at each asynchronous boundary.
    page.evaluate("""() => {
      window.loadPDFLibraries = async () => { throw new Error('mock loader failure'); };
    }""")
    page.get_by_role("button", name="📄 下載評估報告", exact=True).click()
    page.wait_for_function("!pdfDownloadInProgress")
    ok(page.locator("#pdfLoadingStatus, #pdfExportContent").count() == 0 and
       page.locator("#downloadPdfButton").is_enabled(), "loader failure cleans up and enables retry")

    page.evaluate("""() => {
      window.loadPDFLibraries = async () => {};
      window.html2canvas = async () => { throw new Error('mock canvas failure'); };
    }""")
    page.get_by_role("button", name="📄 下載評估報告", exact=True).click()
    page.wait_for_function("!pdfDownloadInProgress")
    ok(page.locator("#pdfLoadingStatus, #pdfExportContent").count() == 0 and
       page.locator("#downloadPdfButton").is_enabled(), "canvas failure cleans up and enables retry")

    page.evaluate("""() => {
      window.html2canvas = async () => ({width: 794, height: 1000, toDataURL: () => 'mock-image'});
      window.jspdf = {jsPDF: class {
        addImage() {} addPage() {} save(name) { window.__savedPdf = name; }
      }};
    }""")
    page.get_by_role("button", name="📄 下載評估報告", exact=True).click()
    page.wait_for_function("!pdfDownloadInProgress")
    ok(page.evaluate("window.__savedPdf?.endsWith('.pdf')") and
       page.locator("#pdfLoadingStatus, #pdfExportContent").count() == 0 and
       page.locator("#downloadPdfButton").is_enabled(), "PDF succeeds after failures without orphaned DOM")
    ok(len(alerts) == 2, "only mocked PDF failures show alerts", alerts)
    ok(not errors, "no uncaught page errors", errors)
    browser.close()

sys.exit(1 if fails else 0)
