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
NO = {f"parq_q{i}": "no" for i in range(1, 8)}
def data(**kw):
    d = dict(age=30, gender="male", height=170, weight=70, bmi=24.2, health_status="healthy",
             diseases=[], fitness_level="good", exercise_habit="moderate", exercise_goal="health",
             limitations=[], parq_answers=dict(NO))
    d.update(kw); return d

CASES = [
  ("成人30 excellent 無運動習慣 全否", data(fitness_level="excellent", exercise_habit="none"),
     dict(frequency=3, time=20, intensity="light", weeklyMinutes=60, heartRateZone="最大心率 57-63%（輕度）")),
  ("兒童10 excellent 全否", data(age=10, bmi=None, fitness_level="excellent"),
     dict(frequency=7, time=80, intensity="moderate-vigorous", weeklyMinutes=560, heartRateZone=None)),
  ("兒童10 poor 全否（不可變 5x20）", data(age=10, bmi=None, fitness_level="poor"),
     dict(frequency=7, time=60, intensity="moderate-vigorous", weeklyMinutes=420)),
  ("成人45 q2胸痛=高風險（BMI 24.2 過重先+1→6, 上限3）", data(age=45, parq_answers={**NO, "parq_q2": "yes"}),
     dict(frequency=3, time=15, intensity="light", weeklyMinutes=45, volume=113, heartRateZone=None)),
  ("成人50 心臟病史 全否", data(age=50, diseases=["heart_recovery"]),
     dict(intensity="light-moderate", heartRateZone=None)),
  ("孕婦30 excellent active 全否", data(gender="female", diseases=["pregnant"], fitness_level="excellent", exercise_habit="active"),
     dict(frequency=4, time=30, intensity="light", weeklyMinutes=120)),
  ("成人30 poor q6骨關節=中風險（心率照給）", data(fitness_level="poor", parq_answers={**NO, "parq_q6": "yes"}),
     dict(frequency=3, time=20, intensity="light", weeklyMinutes=60, heartRateZone="最大心率 57-63%（輕度）")),
  ("成人30 q5服藥 規律運動=中風險→可維持中度、心率不可靠", data(parq_answers={**NO, "parq_q5": "yes"}),
     dict(intensity="moderate", heartRateZone=None)),
  ("成人30 q1高血壓 無運動習慣=中風險→保守起點", data(exercise_habit="none", parq_answers={**NO, "parq_q1": "yes"}),
     dict(frequency=3, time=20, intensity="light", heartRateZone=None)),
  ("成人30 q3頭暈=高風險", data(parq_answers={**NO, "parq_q3": "yes"}),
     dict(intensity="light", time=15, heartRateZone=None)),
  ("成人30 q7醫囑監督=高風險", data(parq_answers={**NO, "parq_q7": "yes"}),
     dict(intensity="light", heartRateZone=None)),
  ("成人50 excellent habit moderate 全否 → >45 不習慣劇烈 cap moderate", data(age=50, bmi=23, fitness_level="excellent"),
     dict(intensity="moderate")),
  ("銀髮70 good 全否", data(age=70, bmi=23),
     dict(frequency=5, time=30, intensity="moderate", weeklyMinutes=150, heartRateZone="最大心率 64-76%（中等強度）")),
  ("兒童10 全是", data(age=10, bmi=None, parq_answers={k: "yes" for k in NO}),
     dict(frequency=7, time=60, intensity="light", heartRateZone=None)),
  ("成人30 pain + excellent moderate習慣", data(fitness_level="excellent", limitations=["pain"]),
     dict(intensity="light")),
  ("成人30 asthma", data(diseases=["asthma"]), dict(intensity="moderate")),
]

fails = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/index.html")
    for name, d, exp in CASES:
        r = pg.evaluate("d => { const p = calculateFITTVP(d); return {frequency:p.frequency,time:p.time,intensity:p.intensity,weeklyMinutes:p.weeklyMinutes,volume:p.volume,heartRateZone:p.heartRateZone,warnings:p.warnings.length,recs:p.recommendations.length,type:p.type}; }", d)
        bad = {k: (r.get(k), v) for k, v in exp.items() if r.get(k) != v}
        status = "OK " if not bad else "FAIL"
        if bad: fails += 1
        print(f"[{status}] {name}: f={r['frequency']} t={r['time']} i={r['intensity']} wk={r['weeklyMinutes']} vol={r['volume']} hr={r['heartRateZone']}")
        if bad: print("       mismatch:", bad)
    # asthma warnings present
    r = pg.evaluate("d => calculateFITTVP(d).warnings.join('|')", data(diseases=["asthma"]))
    print("[OK ]" if "吸入劑" in r else "[FAIL]", "asthma warnings:", "吸入劑" in r)
    # 絕對化用詞
    txt = pg.evaluate("d => JSON.stringify(calculateFITTVP(d))", data())
    print("[OK ]" if "安全地開始" not in txt else "[FAIL]", "no 安全地開始 in output")
    # MET activities follow prescription intensity
    html = pg.evaluate("d => getMETActivitiesHtml(calculateFITTVP(d))", data(age=30, fitness_level="excellent", diseases=["pregnant"]))
    print("[OK ]" if "推薦 輕度 活動" in html else "[FAIL]", "MET activities for pregnant excellent → 輕度")
    # calorie gating via DOM
    pg.evaluate("() => { document.getElementById('age').value=16; document.getElementById('gender').value='male'; document.getElementById('height').value=170; document.getElementById('weight').value=60; calculateBMI(); }")
    hid = pg.evaluate("() => ({row: document.getElementById('loseCaloriesRow').classList.contains('hidden'), note: document.getElementById('loseCaloriesNote').textContent, bmr: document.getElementById('bmrValue').textContent})")
    print("[OK ]" if hid["row"] and "18" in hid["note"] else "[FAIL]", "minor calorie gating:", hid)
    pg.evaluate("() => { document.getElementById('age').value=30; document.getElementById('height').value=175; document.getElementById('weight').value=50; calculateBMI(); }")
    hid = pg.evaluate("() => ({row: document.getElementById('loseCaloriesRow').classList.contains('hidden'), note: document.getElementById('loseCaloriesNote').textContent})")
    print("[OK ]" if hid["row"] and "過輕" in hid["note"] else "[FAIL]", "underweight gating:", hid)
    pg.evaluate("() => { document.getElementById('weight').value=70; document.getElementById('gender').value='other'; calculateBMI(); calculateBMR(); }")
    v = pg.evaluate("() => ({bmr: document.getElementById('bmrValue').textContent, tdee: document.getElementById('tdeeValue').textContent, adv: document.getElementById('calorieAdvice').classList.contains('hidden')})")
    print("[OK ]" if v["bmr"]=="不適用" and v["tdee"]=="不適用" and v["adv"] else "[FAIL]", "gender other clears BMR/TDEE:", v)
    pg.evaluate("() => { document.getElementById('gender').value='female'; calculateBMI(); calculateBMR(); }")
    v = pg.evaluate("() => ({row: document.getElementById('loseCaloriesRow').classList.contains('hidden'), lose: document.getElementById('loseCalories').textContent})")
    print("[OK ]" if not v["row"] and v["lose"] else "[FAIL]", "normal adult shows deficit:", v)
    # BMI category unify
    v = pg.evaluate("() => [getBMICategory(28).label, getBMICategory(32).label, getBMICategory(23).label]")
    print("[OK ]" if v==["輕度肥胖","中度肥胖","正常範圍"] else "[FAIL]", "BMI categories:", v)
    print("page errors:", errors)
    # parq page
    pg2 = b.new_page(); e2=[]; pg2.on("pageerror", lambda e: e2.append(str(e)))
    pg2.goto(BASE + "/parq-form.html")
    v = pg2.evaluate("() => [assessParqLevel({q1:'no',q2:'no',q5:'yes'}).level, assessParqLevel({q2:'yes'}).level, assessParqLevel({}).level]")
    print("[OK ]" if v==["moderate","high","low"] else "[FAIL]", "parq page levels:", v)
    pg2.evaluate("() => { parqAnswers={q1:'no',q2:'yes',q3:'no',q4:'no',q5:'no',q6:'no',q7:'no'}; displayRiskAssessment(assessParqLevel(parqAnswers)); displayExerciseRecommendations(assessParqLevel(parqAnswers)); }")
    t = pg2.evaluate("() => document.getElementById('riskAssessment').textContent + document.getElementById('exerciseRecommendations').textContent")
    print("[OK ]" if "高風險" in t and "安全地" not in t else "[FAIL]", "parq page high risk render")
    pdf = pg2.evaluate("() => generateRiskSummaryForPDF(assessParqLevel(parqAnswers))")
    print("[OK ]" if "高風險" in pdf else "[FAIL]", "parq pdf summary")
    print("parq page errors:", e2)
    b.close()
sys.exit(1 if fails else 0)
