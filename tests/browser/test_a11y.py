"""Playwright 驅動函式驗證。先起靜態伺服器再執行：
  python3 -m http.server 8765 --bind 127.0.0.1 &
  PYTHONPATH=~/Library/Python/3.9/lib/python/site-packages /usr/bin/python3 tests/browser/<檔名>.py
退出碼 0 = 全部通過。
"""
import json
import sys
import time
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
    pg.goto(BASE + "/index.html")
    pg.wait_for_load_state("load")

    # 靜態結構
    st = pg.evaluate("""() => ({
      labelFor: document.querySelectorAll('label[for]').length,
      groups: document.querySelectorAll('[role="radiogroup"],[role="group"]').length,
      groupsLabelled: [...document.querySelectorAll('[role="radiogroup"],[role="group"]')].every(g => document.getElementById(g.getAttribute('aria-labelledby'))),
      tooltips: document.querySelectorAll('.tooltip-text').length,
      hintVisible: (() => { const el = [...document.querySelectorAll('input[name="diseases"][value="hypertension"]')][0]; const hint = el.closest('label').querySelector('.text-sm'); return hint && hint.textContent.includes('閉氣'); })(),
      svgNoHidden: [...document.querySelectorAll('svg')].filter(s => s.getAttribute('aria-hidden') !== 'true').length,
      formErrorRole: document.getElementById('formError').getAttribute('role'),
      aiLoadingRole: document.getElementById('aiLoading').getAttribute('role'),
      progressRole: document.getElementById('progressTrack').getAttribute('role'),
      announcer: !!document.getElementById('stepAnnouncer'),
      h3Tabindex: document.querySelectorAll('.form-step h3[tabindex="-1"]').length,
      gray400OnWhite: [...document.querySelectorAll('.text-gray-400')].filter(e => !e.closest('footer')).length,
      textXsCount: document.querySelectorAll('.text-xs').length,
    })""")
    ok(st["labelFor"] >= 5, "label[for] on basic fields", st["labelFor"])
    ok(st["groups"] == 13 and st["groupsLabelled"], "13 groups with aria-labelledby", json.dumps({"groups": st["groups"], "labelled": st["groupsLabelled"]}))
    ok(st["tooltips"] == 0 and st["hintVisible"], "tooltips converted to visible hints")
    ok(st["svgNoHidden"] == 0, "all svg aria-hidden", st["svgNoHidden"])
    ok(st["formErrorRole"] == "alert" and st["aiLoadingRole"] == "status" and st["progressRole"] == "progressbar", "roles set")
    ok(st["announcer"] and st["h3Tabindex"] == 3, "announcer + focusable step headings")
    ok(st["gray400OnWhite"] == 0, "no text-gray-400 outside footer", st["gray400OnWhite"])
    print("      remaining .text-xs on page:", st["textXsCount"])

    # 進表單頁：title 與焦點
    pg.evaluate("() => showPage('formPage')")
    st = pg.evaluate("() => ({title: document.title, active: document.activeElement && document.activeElement.tagName + ':' + document.activeElement.textContent.trim().slice(0,10)})")
    ok("健康評估問卷" in st["title"] and st["active"].startswith("H2"), "showPage sets title + focuses h2", json.dumps(st, ensure_ascii=False))

    # 欄位驗證訊息
    pg.fill("#age", "200")
    st = pg.evaluate("() => ({inv: document.getElementById('age').getAttribute('aria-invalid'), msg: document.getElementById('ageMsg').textContent, hidden: document.getElementById('ageMsg').classList.contains('hidden')})")
    ok(st["inv"] == "true" and "年齡需介於" in st["msg"] and not st["hidden"], "invalid age → aria-invalid + text message", json.dumps(st, ensure_ascii=False))
    pg.fill("#age", "40")
    st = pg.evaluate("() => ({inv: document.getElementById('age').getAttribute('aria-invalid'), hidden: document.getElementById('ageMsg').classList.contains('hidden')})")
    ok(st["inv"] is None and st["hidden"], "valid age clears message")

    # 步驟錯誤不自動消失 + 聚焦欄位
    pg.evaluate("() => nextStep()")  # 性別未填
    st = pg.evaluate("() => ({visible: !document.getElementById('formError').classList.contains('hidden'), text: document.getElementById('formError').textContent, active: document.activeElement.id, inv: document.getElementById('gender').getAttribute('aria-invalid')})")
    ok(st["visible"] and "性別" in st["text"] and st["active"] == "gender" and st["inv"] == "true", "step error shown, focus on gender, aria-invalid", json.dumps(st, ensure_ascii=False))
    time.sleep(5.5)
    ok(pg.evaluate("() => !document.getElementById('formError').classList.contains('hidden')"), "error still visible after 5.5s")

    # 填完 step1 → nextStep → 焦點在 step2 h3、宣告、aria-current、progress
    pg.select_option("#gender", "female"); pg.fill("#height", "160"); pg.fill("#weight", "55")
    pg.evaluate("() => nextStep()")
    st = pg.evaluate("""() => ({
      errHidden: document.getElementById('formError').classList.contains('hidden'),
      active: document.activeElement.tagName + ':' + document.activeElement.textContent.trim(),
      announce: document.getElementById('stepAnnouncer').textContent,
      current: document.querySelector('.step-indicator[aria-current="step"]').dataset.step,
      valuenow: document.getElementById('progressTrack').getAttribute('aria-valuenow'),
      step2Visible: document.querySelector('.form-step[data-step="2"]').style.display,
    })""")
    ok(st["errHidden"] and st["active"].startswith("H3") and "第 2 步" in st["announce"] and st["current"] == "2" and st["step2Visible"] == "block", "nextStep: focus h3, announce, aria-current", json.dumps(st, ensure_ascii=False))
    ok(st["valuenow"] is not None and st["valuenow"] != "0", "progressbar aria-valuenow updated", st["valuenow"])

    # 結果頁標題層級
    pg.evaluate("""() => {
      const pick = (name, val) => { const el = document.querySelector(`input[name="${name}"][value="${val}"]`); if (el) el.checked = true; };
      pick('health_status','healthy'); pick('fitness_level','good'); pick('exercise_habit','moderate'); pick('exercise_goal','health');
      for (let i=1;i<=7;i++) pick(`parq_q${i}`,'no');
      generatePrescription(); showPage('resultPage');
    }""")
    levels = pg.evaluate("() => [...document.querySelectorAll('#exerciseGuidelines h4, #exerciseGuidelines h5, #exerciseGuidelines h6')].map(h => h.tagName)")
    ok("H4" in levels and all(l != "H5" or "H4" in levels for l in levels), "guidelines headings start at h4", " ".join(levels[:8]))
    ok(pg.evaluate("() => document.title.includes('個人化運動處方')"), "result page title")
    print("page errors:", errors)
    ok(not errors, "no page errors")

    # PAR-Q 頁
    pg2 = b.new_page(); e2 = []; pg2.on("pageerror", lambda e: e2.append(str(e)))
    pg2.goto(BASE + "/parq-form.html")
    st = pg2.evaluate("() => ({labelFor: document.querySelectorAll('label[for]').length, low: getComputedStyle(Object.assign(document.body.appendChild(document.createElement('div')), {className: 'risk-low'})).backgroundColor})")
    ok(st["labelFor"] >= 5 and st["low"] == "rgb(21, 128, 61)", "parq page labels + solid risk color", json.dumps(st))
    pg2.evaluate("() => { parqAnswers={q1:'no',q2:'no',q3:'no',q4:'no',q5:'yes',q6:'no',q7:'no'}; displayRiskAssessment(assessParqLevel(parqAnswers)); }")
    ok(pg2.evaluate("() => document.querySelector('#riskAssessment .bg-black') !== null"), "parq inner panel uses dark overlay")
    ok(not e2, "parq page no errors", e2)
    b.close()
sys.exit(1 if fails else 0)
