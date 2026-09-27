// Detailed, profile-specific context from the existing prescription rules.
// Model-selected priorities remain in advice; this report never invents a dose.
const goals = {health:'健康維護',weight_loss:'減重瘦身',muscle_building:'增肌塑形',endurance:'增強體能',rehabilitation:'復健治療',performance:'運動表現提升'};
const habits = {none:'目前沒有運動習慣',light:'偶爾運動',moderate:'規律運動',active:'經常運動',student_athlete:'學生運動員或有專業訓練'};
const fitness = {excellent:'良好',good:'尚可',fair:'容易疲勞',poor:'日常活動困難'};
const diseases = {overweight:'體重過重',asthma:'氣喘',hypertension:'高血壓',diabetes:'糖尿病',arthritis:'關節問題',heart_recovery:'心臟疾病',sarcopenia:'肌少症',pregnant:'懷孕',hyperlipidemia:'高血脂'};
const limitations = {
  time:['時間安排','先列出可用時段、交通與準備時間，把處方放進實際行事曆。若仍無法安排，記下差距向專業人員討論；錯過的活動不以加倍份量補回。'],
  motivation:['建立動機','把要做的活動連結到一件每天會做的事，預先準備用品。記錄有完成的部分及阻礙，找一位能支持自己節奏的人協助提醒。'],
  equipment:['場地與器材','盤點現有用品與可到達的場地，再對照原處方列出的活動。缺少設備時先詢問合適替代方式；不需要為了開始而急著添購。'],
  pain:['疼痛觀察','記下疼痛位置、出現情境、對日常活動的影響與持續情形。將紀錄帶給專業人員評估，不以忍痛或完成課表作為進步標準。'],
  injury_history:['過往傷害','整理曾受傷的部位、目前仍受影響的動作與既有復健安排。回到活動前，確認原本醫療建議是否需要更新，避免直接套用別人的訓練方式。'],
  balance:['平衡與環境','先整理可能絆倒的物品、確認照明與活動空間。將曾失去平衡的情境告訴專業人員，討論是否需要陪伴或個別指導。'],
  palpitation:['心悸與諮詢','記錄心悸出現的時間、活動情境及伴隨的不適，優先帶去醫療評估；AI 內容不能用來判斷是否可繼續運動。'],
};
const goalNotes = {
  health:'把能持續執行、活動後感受與日常生活品質一起列為回顧重點，不只看某一次的運動成績。',
  weight_loss:'回顧活動是否可持續、精神與恢復情形，不只追蹤體重。飲食需求與體重目標可另與專業人員討論，不因短期變化自行加量。',
  muscle_building:'對照原處方的肌力訓練安排，記錄動作是否熟悉、完成感受及恢復情況。需要調整重量或動作時，請合格人員確認。',
  endurance:'先記錄原處方下實際完成的活動與疲勞感，觀察是否能穩定執行；不要用單次更快或更久取代持續回顧。',
  rehabilitation:'將復健目標寫成想恢復的日常活動，連同疼痛與活動受限情形向治療團隊確認。既有醫療與復健安排優先於這份自評結果。',
  performance:'把比賽、團隊訓練及恢復安排一起記下，和教練或專業團隊討論。此表單沒有完整訓練負荷資料，不據此自行疊加課表。',
};
export function buildDetailedReport(ctx) {
  const {data:d,baseline:b,risk,consult}=ctx;
  const ageStage=d.age<12?'兒童':d.age<18?'青少年':d.age>=65?'銀髮族':'成人';
  const goal=d.age<18 && d.exercise_goal==='weight_loss'?'以成長、活動參與及身體感受為重點':goals[d.exercise_goal];
  const selectedLimits=d.limitations.filter(x=>x!=='none').map(x=>limitations[x]);
  const profile=[
    `年齡與活動背景：${d.age} 歲（${ageStage}），${habits[d.exercise_habit]}，體能自評為「${fitness[d.fitness_level]}」。這些是自填概況，不等同運動測試或診斷。`,
    `本次目標：${goal}。${d.age<18?'請與家長或照顧者一起安排有趣、適齡的活動，不套用成人減重或熱量限制。':goalNotes[d.exercise_goal]}`,
    `健康篩檢：PAR-Q+ 有 ${risk.yesCount} 題回答「是」。${consult?'這份報告以諮詢準備為主，請先確認哪些活動適合目前狀態。':'目前問卷未出現肯定答案；仍需留意填表後的身體變化，問卷不能保證運動沒有風險。'}`,
  ];
  if(d.diseases.length) profile.push(`已填寫的健康狀況：${d.diseases.map(x=>diseases[x]).join('、')}。表單未包含完整病史、用藥與檢查結果，相關調整需要由熟悉你狀況的專業人員確認。`);
  if(d.age>=65) profile.push('日常功能也值得記錄：外出、上下樓梯及生活中的平衡困難，都可作為與專業人員討論活動安排的線索。');
  const dose = consult ? [
    ['目前優先事項','先完成問卷追蹤與專業諮詢；本報告不另外安排訓練天數、時間或強度。'],
    ['帶去確認','把標準處方、問卷回答與既有醫療建議一起提供，詢問目前可以做什麼、應暫緩什麼，以及何時回顧。'],
    ['獲得個別建議後','依醫療或運動專業人員確認的內容安排活動；症狀或健康狀態改變時再確認。'],
  ] : [
    ['頻率與時間',`${b.frequency===7?'每日身體活動':`每週 ${b.frequency} 次`}；${b.frequency===7?'每日':'每次'} ${b.time} 分鐘。以上沿用標準處方；先確認生活中可執行的時段，不另外累加 AI 建議的運動量。`],
    ['強度判讀',`${{light:'輕度強度', 'light-moderate':'輕度至中度強度',moderate:'中度強度','moderate-vigorous':'中度至劇烈強度'}[b.intensity]}。對照標準處方的自覺用力與安全提醒，不用別人的速度或重量判斷自己應做多少。`],
    ['活動選擇',`原處方包含：${b.type.join('、')}。先從熟悉且場地允許的項目安排；不熟悉的動作先尋求指導，避免一次加入太多新內容。`],
    ['進展與回顧',`原處方進展：${b.progression}。這是原規則的建議，仍需配合實際反應與個別專業建議，不因 AI 重新產生而自動加量。`],
  ];
  const barriers=selectedLimits.length?selectedLimits.map(([title,text])=>`${title}：${text}`):['目前未填寫特別限制。仍可先確認時間、場地與用品是否可行；若開始後發現阻礙，把實際情境記下，再調整安排。'];
  if(d.parq_answers.parq_q5==='yes') barriers.push('用藥資訊：帶上藥袋或完整用藥清單，詢問是否影響活動時的觀察方式。不要自行停藥或推測某種藥物對運動的影響。');
  const schedule=consult?[
    ['諮詢前','保存標準處方與本報告，圈出問卷回答「是」的題目，整理症狀、健康變化與想恢復的活動。'],
    ['諮詢時','確認適合活動、需暫緩的情境、是否需要陪同，以及何時再評估；把個別建議寫下。'],
    ['諮詢後','依確認後的安排執行；保留身體反應與困難紀錄，健康狀況改變時再次確認。'],
  ]:[
    ['安排時段','將原處方的頻率與時間寫進本週行事曆，連準備、交通與活動後整理一併考慮；先選一項熟悉的活動。'],
    ['活動前','確認身體狀態與填表時是否相同、環境與用品是否準備妥當，再依標準處方的暖身及安全提醒開始。'],
    ['活動中與結束後','留意實際用力感與不適，結束後記錄活動內容、時間及身體反應。出現不適時依安全提醒處理，不以完成量為優先。'],
    ['本週回顧','比較原本安排與實際完成，找出最常遇到的阻礙。決定下次先改善哪一項準備工作；份量調整回到原處方與專業建議。'],
  ];
  return {version:1,sections:[
    {id:'profile',title:'你的條件與本次重點',kind:'list',items:profile},
    {id:'prescription',title:consult?'諮詢前先確認的事':'把標準處方轉成執行方式',kind:'rows',items:dose},
    {id:'barriers',title:'針對你的限制做準備',kind:'list',items:barriers},
    {id:'schedule',title:consult?'諮詢準備流程':'本週如何落實',kind:'rows',items:schedule},
    {id:'safety',title:'必須保留的安全提醒',kind:'list',items:[...new Set([...risk.recommendations,...b.warnings,ctx.safety])]},
    {id:'tracking',title:'可直接使用的回顧紀錄',kind:'rows',items:[
      ['日期與活動','日期：＿＿＿＿　活動／情境：＿＿＿＿'],
      ['實際執行','原本安排：＿＿＿＿　實際完成：＿＿＿＿'],
      ['身體反應','活動前／中／後的感受或不適：＿＿＿＿'],
      ['遇到的阻礙','時間、場地、用品、動機或其他困難：＿＿＿＿'],
      ['下一步','下次要改善的準備／想詢問的問題：＿＿＿＿'],
    ]},
  ]};
}
