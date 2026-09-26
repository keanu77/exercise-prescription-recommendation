"""Playwright 驅動函式驗證。先起靜態伺服器再執行：
  python3 -m http.server 8765 --bind 127.0.0.1 &
  PYTHONPATH=~/Library/Python/3.9/lib/python/site-packages /usr/bin/python3 tests/browser/<檔名>.py
退出碼 0 = 全部通過。
"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"
fails = 0
def ok(cond, name, extra=""):
    global fails
    print(f"[{'OK ' if cond else 'FAIL'}] {name} {extra}")
    if not cond:
        fails += 1

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    calls = []
    def handler(route, request):
        calls.append(json.loads(request.post_data))
        if len(calls) == 1:
            route.fulfill(status=200, content_type="application/json",
                body=json.dumps({"success": True, "recommendation": "<div class='ai-section'><p>AI 建議內容</p><img src=x onerror=alert(1)><script>alert(2)</script></div>", "provider": "Groq (openai/gpt-oss-120b)", "model": "openai/gpt-oss-120b", "truncated": True}))
        else:
            route.fulfill(status=502, content_type="application/json", body=json.dumps({"success": False, "error": "AI 服務暫時無法使用，請稍後再試"}))
    pg.route("**/api/ai-recommendation", handler)
    pg.goto(BASE + "/index.html")

    # 填表並產生處方（直接用 JS 設值後呼叫 generatePrescription）
    pg.evaluate("""() => {
      document.getElementById('age').value = 40; document.getElementById('gender').value = 'female';
      document.getElementById('height').value = 160; document.getElementById('weight').value = 55;
      const pick = (name, val) => { const el = document.querySelector(`input[name="${name}"][value="${val}"]`); if (el) el.checked = true; };
      pick('health_status','healthy'); pick('fitness_level','good'); pick('exercise_habit','moderate'); pick('exercise_goal','health');
      for (let i=1;i<=7;i++) pick(`parq_q${i}`,'no');
      generatePrescription();
      showPage('resultPage');
    }""")
    st = pg.evaluate("() => ({consent: !document.getElementById('aiConsent').classList.contains('hidden'), loading: document.getElementById('aiLoading').classList.contains('hidden'), refresh: document.getElementById('refreshAiBtn').classList.contains('hidden'), calls: %d})" % len(calls))
    ok(st["consent"] and st["loading"] and st["refresh"] and len(calls) == 0, "after generate: consent shown, no auto AI call", json.dumps(st))
    ok(pg.evaluate("() => window.lastPrescription && window.lastPrescription.intensity"), "lastPrescription set")
    ok(pg.evaluate("() => document.getElementById('prescriptionSummary').textContent.length > 50"), "summary rendered")
    ok(pg.evaluate("() => document.body.textContent.includes('請先閱讀')"), "disclaimer present on result page")

    # 按下同意按鈕 → 呼叫 AI
    pg.click("#aiConsent button")
    pg.wait_for_function("() => !document.getElementById('aiContent').classList.contains('hidden')", timeout=5000)
    html = pg.evaluate("() => document.getElementById('aiContent').innerHTML")
    ok("AI 建議內容" in html and "onerror" not in html and "<script" not in html, "AI content sanitized by DOMPurify", html[:120])
    ok(pg.evaluate("() => !document.getElementById('aiTruncatedNote').classList.contains('hidden')"), "truncated note shown")
    ok(pg.evaluate("() => !document.getElementById('refreshAiBtn').classList.contains('hidden')"), "refresh button visible after content")
    ok(calls[0]["provider"] == "auto" and calls[0]["userData"]["prescription"]["intensity"] in ("light","light-moderate","moderate","moderate-vigorous"), "payload shape ok", json.dumps(calls[0]["userData"]["prescription"]))
    ok("parq_answers" in calls[0]["userData"], "payload has parq_answers")

    # 重新生成 → 模擬 502 錯誤
    pg.click("#refreshAiBtn")
    pg.wait_for_function("() => !document.getElementById('aiError').classList.contains('hidden')", timeout=5000)
    ok(pg.evaluate("() => document.getElementById('aiErrorMessage').textContent.includes('暫時無法使用')"), "error state rendered")

    # 再產生一次處方 → 回到 consent，舊內容清空
    pg.evaluate("() => generatePrescription()")
    st = pg.evaluate("() => ({consent: !document.getElementById('aiConsent').classList.contains('hidden'), content: document.getElementById('aiContent').innerHTML, err: document.getElementById('aiError').classList.contains('hidden')})")
    ok(st["consent"] and st["content"] == "" and st["err"], "regenerate resets AI section", json.dumps(st)[:100])

    # DOMPurify 缺失 → fail-closed
    pg.evaluate("() => { window.DOMPurify = undefined; fetchAIRecommendation(); }")
    st = pg.evaluate("() => ({err: !document.getElementById('aiError').classList.contains('hidden'), msg: document.getElementById('aiErrorMessage').textContent})")
    ok(st["err"] and "安全過濾" in st["msg"], "DOMPurify missing → fail-closed", st["msg"][:40])

    # 模型清單與後端白名單同步
    fe = pg.evaluate("() => Object.fromEntries(Object.entries(AI_PROVIDERS).filter(([k])=>k!=='auto').map(([k,v])=>[k, v.models.map(m=>m.id)]))")
    import re
    import pathlib
    src = (pathlib.Path(__file__).resolve().parents[2] / "functions/_lib/ai.js").read_text()
    m = re.search(r"const MODEL_ALLOWLIST = \{(.*?)\n\};", src, re.S).group(1)
    be = {k: re.findall(r'"([^"]+)"', v) for k, v in re.findall(r'\n\s*(\w+): \[(.*?)\]', m)}
    ok(fe == be, "frontend model lists == backend allowlist", json.dumps({"fe": fe, "be": be}, ensure_ascii=False) if fe != be else "")
    print("page errors:", errors)
    ok(not errors, "no page errors")
    b.close()
sys.exit(1 if fails else 0)
