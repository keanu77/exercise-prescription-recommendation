import '../../prescription-rules.js';
export const RULES_VERSION = globalThis.ExerciseRules.rulesVersion;
export const PROMPT_VERSION = 'action-cards-2';
export const SOURCE = { id:'parq', title:'PAR-Q+ 官方問卷與追蹤評估', url:'https://eparmedx.com/' };
const groups = ['startToday','adaptations','checkIn'];
// The model prioritizes eligible actions, never authors a dose, diagnosis or URL.
// These are practical organization prompts, not a second clinical rules engine.
export function buildAdviceContext(data) {
  const baseline = globalThis.ExerciseRules.calculateFITTVP(data);
  const risk = globalThis.ExerciseRules.assessPARQRisk(data.parq_answers);
  const consult = risk.level !== 'low' || data.diseases.includes('pregnant') || data.diseases.includes('heart_recovery') || data.limitations.includes('palpitation');
  const catalog = {startToday:{},adaptations:{},checkIn:{}};
  const add=(group,id,text)=>{catalog[group][id]=text;};
  if (consult) {
    add('startToday','bring_report','先保存這份評估，連同目前的不適、既有疾病與運動習慣一起整理。諮詢時讓專業人員看到完整背景，不必只記住風險分級。');
    add('startToday','follow_up','把問卷回答「是」的題目標出，依本頁提醒完成後續評估。這張卡片用來準備諮詢，不代表已取得開始或增加運動的許可。');
    add('startToday','questions','寫下自己最想恢復的日常活動，以及目前最擔心的困難。諮詢時先談這些目標，讓後續安排更貼近你的生活需要。');
    add('adaptations','ask_limits','帶著上方處方詢問：「哪些活動適合我？哪些情況應暫緩？是否需要有人在旁協助？」確認後，再依個別建議安排活動。');
    add('adaptations','ask_changes','如果健康狀況或症狀和填表時不同，先把變化記下並告訴醫療人員。不要直接沿用舊評估，或以重新產生 AI 建議取代諮詢。');
    add('adaptations','log_barriers','把時間、場地、疼痛或照顧責任等實際障礙列出。諮詢時請專業人員協助選擇可行做法，暫時不自行增加處方的強度或份量。');
  } else {
    add('startToday','calendar','在行事曆中挑一個確實能空出的時段，將上方處方放在容易看到的地方。先安排得進生活，開始時再依原處方的頻率、時間與強度執行。');
    add('startToday','prepare','事先整理需要的衣物與用品，確認場地和交通是否方便。把準備工作做好，讓開始運動時少一點臨時決定，也比較容易持續。');
    add('startToday','choose','從上方列出的活動中，先選自己熟悉、環境也允許的一項。這次以落實原計畫為目標，無須為了追求表現另外增加運動份量。');
    add('adaptations','missed','臨時錯過原訂時段時，先找出被什麼事情打斷，再調整行事曆。不需要為了補進度，在下一次自行加長時間或提高強度。');
    add('adaptations','support','告訴一位信任的人你正在嘗試建立運動習慣，約好互相提醒的方式。選擇能支持自己節奏的陪伴，避免為了跟上別人而加量。');
    add('adaptations','review','若這份安排反覆難以執行，記下最常卡住的地方，帶去和運動專業人員討論。調整應回到個人條件與原處方，不必把困難歸咎於意志力。');
    if(data.limitations.includes('time')) add('adaptations','time','先檢視行事曆，找出最常被工作或家庭打斷的時段，把準備用品和交通時間一起考慮。若原處方仍排不進生活，請專業人員協助調整。');
    if(data.limitations.includes('equipment')) add('adaptations','equipment','先確認附近可用的空間與現有用品，從原處方已列出的活動中選擇。若缺少必要設備，請教合格運動專業人員適合的替代方式，不必急著購買。');
    if(data.limitations.includes('motivation')) add('adaptations','motivation','把今天要做的準備寫成清單，完成後留下記錄。也可以和熟悉的人約定提醒方式；重點是建立可持續的習慣，不用和別人的進度比較。');
    if(data.limitations.some(x=>['pain','injury_history','balance'].includes(x))) add('adaptations','discomfort','把疼痛、平衡困難或過往傷害影響的動作記下，和專業人員討論適合的調整。出現不適時依本頁安全提醒處理，不要自行忍痛完成。');
  }
  add('checkIn','record','下次回顧時，記下實際完成了什麼、感受如何，以及哪個環節最難安排。保留自己的紀錄，比只看有沒有達成目標更能幫助後續討論。');
  add('checkIn','changes','留意填表之後健康狀況或用藥是否改變；有變化時重新向專業人員確認。這份評估和行動卡只反映當時提供的資料，不能自動隨身體狀況更新。');
  add('checkIn','observe','把活動前後的不適與發生情境寫下，回診或諮詢時帶著一起討論。不要只靠運動完成度判斷是否適合繼續，仍須遵循本頁與醫師的安全提醒。');
  if(data.parq_answers.parq_q5==='yes') add('checkIn','medication','整理目前的藥袋或用藥清單，詢問它們是否影響運動時的觀察方式。問卷未提供藥名，這份建議不推測藥物種類，也不建議自行停藥或改藥。');
  if(data.age<18) add('checkIn','guardian','和家長或照顧者一起回顧活動是否有趣、環境是否安全，以及身體的感受。需要調整時請教熟悉兒少活動的專業人員，不套用成人的減重或訓練目標。');
  const summary=consult?'先把問卷與生活上的困難整理好，帶去諮詢。以下協助你準備討論，不是新的訓練課表。':'從原處方出發，把開始前的準備、生活中的阻礙與下次回顧串起來，找到適合自己的執行節奏。';
  const safety = consult ? '請先依上方問卷與處方提醒完成追蹤評估及諮詢；AI 行動卡不代表運動許可。' : '頻率、時間與強度請依上方處方；運動中如感到不適，請立即停止並尋求專業協助。';
  return {data,baseline,risk,consult,catalog,summary,safety};
}
export function adviceSchema(ctx) {
  return {type:'object',additionalProperties:false,required:groups,properties:Object.fromEntries(groups.map(g=>[g,{type:'array',minItems:2,maxItems:2,items:{type:'string',enum:Object.keys(ctx.catalog[g])}}]))};
}
export function validateSelection(content,ctx) {
  let value; try {value=JSON.parse(content);} catch {throw Object.assign(new Error('Invalid JSON'),{code:'INVALID_OUTPUT'});}
  if (!value || typeof value!=='object' || Object.keys(value).length!==3 || !groups.every(g=>Array.isArray(value[g]) && value[g].length===2 && new Set(value[g]).size===2 && value[g].every(id=>typeof id==='string' && Object.hasOwn(ctx.catalog[g],id)))) throw Object.assign(new Error('Invalid action selection'),{code:'INVALID_OUTPUT'});
  return value;
}
export function presentAdvice(selection,ctx) {
  const advice={summary:ctx.summary,...Object.fromEntries(groups.map(g=>[g,selection[g].map(id=>ctx.catalog[g][id])])),questionsForClinician:[],sourceIds:['parq']};
  return {advice,mode:ctx.consult?'consultation':'actions',risk:ctx.risk.level,safety:ctx.safety,baseline:ctx.baseline,sources:[SOURCE]};
}
