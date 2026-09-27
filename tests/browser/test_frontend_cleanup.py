"""Playwright 驅動函式驗證。先起靜態伺服器再執行：
  python3 -m http.server 8765 --bind 127.0.0.1 &
  PYTHONPATH=~/Library/Python/3.9/lib/python/site-packages /usr/bin/python3 tests/browser/<檔名>.py
退出碼 0 = 全部通過。
"""
import os
import json
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8765")
fails = 0
def ok(cond, name, extra=""):
    global fails
    print(f"[{'OK ' if cond else 'FAIL'}] {name} {extra}")
    if not cond:
        fails += 1

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errors = []; console = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: console.append(m.text) if m.type in ("error", "warning") else None)
    pg.goto(BASE + "/index.html"); pg.wait_for_load_state("load")

    st = pg.evaluate("""() => {
      const purify = document.querySelector('script[src*="purify"]');
      const cs = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null; };
      const probe = document.body.appendChild(document.createElement('div'));
      const style = (cls) => { probe.className = cls; return getComputedStyle(probe); };
      return {
        inlineStyle: document.querySelectorAll('style').length,
        purifyDefer: purify && purify.defer && !!purify.integrity && purify.crossOrigin === 'anonymous',
        purifyLoaded: typeof window.DOMPurify !== 'undefined',
        fontWeights: document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis"]').href.includes('wght@400;500;700'),
        preconnectCdn: !!document.querySelector('link[rel="preconnect"][href*="cdnjs"]'),
        iconPos: cs('#ageIcon').position,
        wrapperPos: cs('.input-wrapper').position,
        loadingModal: style('loading-modal').display,
        loadingModalActive: style('loading-modal active').display,
        spinnerAnim: style('loading-spinner').animationName,
        inactiveStepOpacity: getComputedStyle(document.querySelector('.step-indicator[data-step="3"]')).opacity,
        oninput: document.getElementById('age').getAttribute('oninput'),
        deadFns: ['formatDiseases','showFieldError','markFieldComplete','getFitnessLevelText','getExerciseHabitText'].filter(f => typeof window[f] === 'function'),
        loadScriptArity: loadScript.length,
      };
    }""")
    ok(st["inlineStyle"] == 0, "no inline <style> in index.html")
    ok(not st["purifyDefer"] and not st["purifyLoaded"], "structured cards require no external HTML sanitizer")
    ok(st["fontWeights"] and st["preconnectCdn"], "font weights 400/500/700 + cdnjs preconnect")
    ok(st["iconPos"] == "absolute" and st["wrapperPos"] == "relative", "validation icon/wrapper styles migrated", json.dumps({"icon": st["iconPos"], "wrap": st["wrapperPos"]}))
    ok(st["loadingModal"] == "none" and st["loadingModalActive"] == "flex" and st["spinnerAnim"] == "spin", "loading modal styles migrated", json.dumps({"m": st["loadingModal"], "a": st["loadingModalActive"], "s": st["spinnerAnim"]}))
    ok(st["inactiveStepOpacity"] == "1", "inactive step remains fully opaque")
    # The sports design has a dark desktop sidebar and a light mobile stepper.
    # Check readability on both surfaces instead of locking in the old gray color.
    for width in [390, 1280]:
        pg.set_viewport_size({"width": width, "height": 900})
        contrast = pg.evaluate("""() => {
          const label = document.querySelector('.step-indicator[data-step="3"] .step-label');
          const rgb = color => color.match(/[\\d.]+/g).map(Number);
          const luminance = channels => channels.slice(0, 3).map(v => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          let surface = label;
          while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') {
            surface = surface.parentElement;
          }
          const foreground = luminance(rgb(getComputedStyle(label).color));
          const background = luminance(rgb(surface ? getComputedStyle(surface).backgroundColor : 'rgb(255, 255, 255)'));
          return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        }""")
        ok(contrast >= 4.5, f"inactive step label contrast at {width}px", f"{contrast:.2f}:1")
    ok(st["oninput"] is None, "numeric input uses external event listener")
    ok(st["deadFns"] == [], "dead functions removed", st["deadFns"])
    ok(st["loadScriptArity"] == 2, "loadScript accepts integrity")

    # 欄位驗證圖示仍運作；清空身高 → BMR/TDEE 重置
    pg.evaluate("() => showPage('formPage')")
    pg.fill("#age", "30"); pg.select_option("#gender", "male"); pg.fill("#height", "170"); pg.fill("#weight", "70")
    st = pg.evaluate("() => ({icon: document.getElementById('heightIcon').textContent, bmr: document.getElementById('bmrValue').textContent})")
    ok(st["icon"] == "✓" and st["bmr"] not in ("待計算", ""), "validation icon + BMR computed", json.dumps(st))
    pg.fill("#height", "")
    st = pg.evaluate("() => ({bmi: document.getElementById('bmiValue').textContent, bmr: document.getElementById('bmrValue').textContent, tdee: document.getElementById('tdeeValue').textContent, adv: document.getElementById('calorieAdvice').classList.contains('hidden')})")
    ok(st["bmi"] == "待計算" and st["bmr"] == "待計算" and st["tdee"] == "待計算" and st["adv"], "clearing height resets BMI/BMR/TDEE/advice", json.dumps(st))

    # PDF BMR：other → 不適用；createPDFReport 沿用 lastPrescription
    st = pg.evaluate("() => ({other: calculateBMRForPDF({age:30,gender:'other',height:170,weight:70}), tdee: calculateTDEEForPDF({age:30,gender:'other',height:170,weight:70}), male: calculateBMRForPDF({age:30,gender:'male',height:170,weight:70})})")
    ok(st["other"] == "不適用" and st["tdee"] == "不適用" and st["male"] == 1618, "PDF BMR consistent with screen", json.dumps(st))
    st = pg.evaluate("""() => {
      const previous = window.lastPrescription;
      try {
        window.lastPrescription = {frequency:2, time:17, intensity:'light', type:['有氧運動'],
          volume:119, progression:'沿用已顯示處方', warnings:[], recommendations:[]};
        return createPDFReport().sections.find(section => section.kind === 'rows').items;
      } finally { window.lastPrescription = previous; }
    }""")
    ok(st[0][1] == '每週 2 次運動' and st[2][1] == '每次運動 17 分鐘' and
       st[5][1] == '沿用已顯示處方', "PDF reuses displayed prescription values without recalculation")

    # debounce：連續 input 後進度更新一次即可（只確認最終值正確）
    pg.fill("#height", "170")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("() => parseInt(document.getElementById('progressText').textContent) > 0"), "progress updates after debounce")

    # 草稿還原守門：sessionStorage 放 null 不噴錯
    pg.evaluate("() => { sessionStorage.setItem('exerciseRxFormDraft', 'null'); }")
    pg.evaluate("() => { try { restoreFormDraft(); return true; } catch (e) { return false; } }")
    ok(pg.evaluate("() => { try { restoreFormDraft(); return true; } catch (e) { return false; } }"), "restoreFormDraft tolerates null draft")
    print("page errors:", errors, "console:", [c for c in console if "favicon" not in c][:3])
    ok(not errors, "no page errors")

    # PAR-Q 頁
    pg2 = b.new_page(); e2 = []; pg2.on("pageerror", lambda e: e2.append(str(e)))
    pg2.goto(BASE + "/parq-form.html"); pg2.wait_for_load_state("load")
    st = pg2.evaluate("() => ({font: !!document.querySelector('link[href*=\"fonts.googleapis\"][href*=\"wght@400;500;700\"]'), importLeft: [...document.querySelectorAll('style')].some(s => s.textContent.includes('@import')), arity: loadScript.length})")
    ok(st["font"] and not st["importLeft"] and st["arity"] == 2, "parq: font via link, no @import, loadScript integrity", json.dumps(st))
    pg2.evaluate("() => { window.alert = (m) => { window.__alert = m; }; document.getElementById('age').value = 200; document.getElementById('gender').value='male'; document.getElementById('height').value=170; document.getElementById('weight').value=70; proceedToPARQ(); }")
    st = pg2.evaluate("() => ({alert: window.__alert || '', active: document.activeElement.id})")
    ok(st["alert"] != "", "parq: out-of-range age blocked (alert)", json.dumps(st, ensure_ascii=False)[:120])
    ok(not e2, "parq page no errors", e2)
    b.close()
sys.exit(1 if fails else 0)
