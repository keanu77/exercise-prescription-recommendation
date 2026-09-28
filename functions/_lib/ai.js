import '../../prescription-rules.js';
import { adviceSchema } from './advice.js';
export { DEFAULT_MODELS, MODEL_ALLOWLIST } from './models.js';
/**
 * 運動處方 AI 建議 — 共用邏輯（Cloudflare Pages Functions 使用）
 * 金鑰一律由呼叫端傳入（Pages Secrets 或使用者自帶）。
 * 這是唯一的後端 AI 邏輯來源；提示詞、驗證規則、模型清單都在這裡改。
 */
// ============== 對照表（驗證白名單與 AI 摘要共用） ==============

const fitnessMap = {
  excellent: "良好",
  good: "尚可",
  fair: "容易疲勞",
  poor: "日常活動困難",
};

const habitMap = {
  none: "沒有運動習慣",
  light: "偶爾運動（每週1-2次）",
  moderate: "規律運動（每週3-4次）",
  active: "經常運動（每週5次以上）",
  student_athlete: "學生運動員或專業訓練",
};

const goalMap = {
  health: "健康維護",
  weight_loss: "減重瘦身",
  muscle_building: "增肌塑形",
  endurance: "增強體能",
  rehabilitation: "復健治療",
  performance: "運動表現提升",
};

const diseaseMap = {
  overweight: "體重過重",
  asthma: "氣喘",
  hypertension: "高血壓",
  diabetes: "糖尿病",
  arthritis: "關節問題",
  heart_recovery: "心臟疾病",
  sarcopenia: "肌少症",
  pregnant: "孕婦",
  hyperlipidemia: "高血脂",
};

const limitationMap = {
  none: "無特別限制",
  time: "時間限制",
  motivation: "缺乏動機",
  pain: "疼痛問題",
  injury_history: "運動傷害史",
  balance: "平衡感不佳",
  palpitation: "心悸",
  equipment: "缺乏運動設備",
};

const ENUMS = {
  gender: ["male", "female", "other"],
  health_status: ["healthy", "has_conditions"],
  fitness_level: Object.keys(fitnessMap),
  exercise_habit: Object.keys(habitMap),
  exercise_goal: Object.keys(goalMap),
  diseases: Object.keys(diseaseMap),
  limitations: Object.keys(limitationMap),
  intensity: ["light", "light-moderate", "moderate", "moderate-vigorous"],
  parq_answer: ["yes", "no"],
};
const PARQ_KEYS = ["parq_q1", "parq_q2", "parq_q3", "parq_q4", "parq_q5", "parq_q6", "parq_q7"];


// ============== 輸入驗證函數 ==============
/**
 * 驗證並正規化使用者資料。
 * 回傳 { valid, errors, data }：data 只含通過白名單/範圍檢查後的欄位，
 * buildUserSummary 只能吃 data，不得再碰原始輸入（避免 "35 INJECT" 這類數字前綴繞過）。
 */
function validateUserData(userData) {
  const errors = [];
  const data = {};

  if (!userData || typeof userData !== "object" || Array.isArray(userData)) {
    return { valid: false, errors: ["用戶資料格式錯誤"], data: null };
  }

  const numberIn = (key, min, max, label, integer) => {
    const raw = userData[key];
    const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      errors.push(`${label}必須在 ${min}-${max} 之間`);
      return;
    }
    data[key] = n;
  };
  const enumIn = (key, list, label, required) => {
    const v = userData[key];
    if (v === undefined || v === null || v === "") {
      if (required) errors.push(`缺少${label}`);
      return;
    }
    if (typeof v !== "string" || !list.includes(v)) {
      errors.push(`${label}選項無效`);
      return;
    }
    data[key] = v;
  };
  const enumArrayIn = (key, list, label) => {
    const v = userData[key];
    if (v === undefined) {
      data[key] = [];
      return;
    }
    if (!Array.isArray(v) || v.length > list.length) {
      errors.push(`${label}資料格式錯誤`);
      return;
    }
    if (!v.every((x) => typeof x === "string" && list.includes(x))) {
      errors.push(`${label}含無效選項`);
      return;
    }
    data[key] = [...new Set(v)];
  };

  numberIn("age", 6, 120, "年齡", true);
  numberIn("height", 50, 300, "身高", false);
  numberIn("weight", 10, 500, "體重", false);
  enumIn("gender", ENUMS.gender, "性別", true);
  enumIn("health_status", ENUMS.health_status, "健康狀況", true);
  enumIn("fitness_level", ENUMS.fitness_level, "體能自評", true);
  enumIn("exercise_habit", ENUMS.exercise_habit, "運動習慣", true);
  enumIn("exercise_goal", ENUMS.exercise_goal, "運動目標", true);
  enumArrayIn("diseases", ENUMS.diseases, "疾病");
  enumArrayIn("limitations", ENUMS.limitations, "運動限制");

  // BMI：只在成人且有身高體重時由伺服器自行計算，不信任前端數值
  if (data.age >= 18 && data.height && data.weight) {
    data.bmi = Math.round((data.weight / Math.pow(data.height / 100, 2)) * 10) / 10;
  } else {
    data.bmi = null;
  }

  // PAR-Q 答案：只接受 parq_q1..7 = yes|no
  const pa = userData.parq_answers;
  if (pa === undefined) {
    errors.push("請完整回答七題 PAR-Q");
  } else if (!pa || typeof pa !== "object" || Array.isArray(pa)) {
    errors.push("PAR-Q 答案格式錯誤");
  } else {
    data.parq_answers = {};
    for (const key of PARQ_KEYS) {
      const v = pa[key];
      if (v === undefined) { errors.push("請完整回答七題 PAR-Q"); break; }
      if (!ENUMS.parq_answer.includes(v)) {
        errors.push("PAR-Q 答案含無效值");
        break;
      }
      data.parq_answers[key] = v;
    }
  }

  if (data.health_status === "healthy" && data.diseases?.length) errors.push("健康狀況與疾病選項不一致，請重新確認");
  if (data.limitations?.includes("none") && data.limitations.length > 1) errors.push("運動限制選項不一致");
  // Ignore client prescription/risk entirely: compute with the exact same shared rules.
  if (!errors.length) data.prescription = globalThis.ExerciseRules.calculateFITTVP(data);

  return { valid: errors.length === 0, errors, data: errors.length === 0 ? data : null };
}

// 清理 API 金鑰（移除危險字元）
function sanitizeApiKey(key) {
  if (!key || typeof key !== "string") return null;
  // API 金鑰只允許字母數字和連字號/底線
  return /^[a-zA-Z0-9_-]{1,256}$/.test(key) ? key : null;
}


export { validateUserData, sanitizeApiKey };
export const SYSTEM_PROMPT = '你協助使用者落實既有運動計畫。從各組 eligibleActions 選兩個最貼近個人限制的不同 ID，依優先順序排列。consultation 模式只選就醫前準備。不得新增文字、數值、來源或動作。時間、器材、動機、兒少、服藥等專屬選項若適用，優先選擇。只輸出符合 schema 的 JSON。';
export function buildUserSummary(data, ctx) {
  // No client text, names or keys; trusted baseline supplies all clinical context.
  const {frequency,time,intensity,type,heartRateZone}=ctx.baseline;
  const eligibleActions=Object.fromEntries(Object.entries(ctx.catalog).map(([group,items])=>
    [group,Object.fromEntries(Object.entries(items).map(([id,text])=>[id,text.split(/[，。]/)[0]]))]));
  return JSON.stringify({profile:{age:data.age,gender:data.gender,diseases:data.diseases,fitness:fitnessMap[data.fitness_level],habit:habitMap[data.exercise_habit],goal:goalMap[data.exercise_goal],limitations:data.limitations},
    baseline:{frequency,time,intensity,type,heartRateZone},risk:ctx.risk.level,mode:ctx.consult?'consultation':'actions',eligibleActions});
}
export function parseRetryAfter(raw, now=Date.now()) {
  if(!raw) return null;
  const n=/^\d+$/.test(raw)?Number(raw):Math.ceil((Date.parse(raw)-now)/1000);
  return Number.isFinite(n)&&n>=0 ? Math.min(Math.ceil(n),86400) : null;
}
const MAX_OUTPUT_TOKENS=1800;
async function readProviderEnvelope(response) {
  const maximum = 128 * 1024;
  const incomplete = () => Object.assign(new Error('Incomplete response'), { code: 'INCOMPLETE_OUTPUT' });
  if (Number(response.headers.get('Content-Length')) > maximum) {
    await response.body?.cancel();
    throw incomplete();
  }
  const reader = response.body?.getReader();
  if (!reader) throw incomplete();
  let size = 0, raw = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw incomplete(); }
      raw += decoder.decode(value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw error;
    throw incomplete();
  } finally { reader.releaseLock(); }
}
export async function callProvider(provider, summary, apiKey, model, ctx, options = {}) {
  const schema=options.schema || adviceSchema(ctx), systemPrompt=options.systemPrompt || SYSTEM_PROMPT;
  const maxOutputTokens=options.maxOutputTokens || MAX_OUTPUT_TOKENS;
  const schemaName=options.schemaName || 'action_cards';
  const messages=[{role:'system',content:systemPrompt},{role:'user',content:summary}];
  let url, headers, body;
  if(provider==='groq') {
    url='https://api.groq.com/openai/v1/chat/completions'; headers={Authorization:`Bearer ${apiKey}`};
    body={model,messages,max_completion_tokens:maxOutputTokens,reasoning_effort:'low',response_format:{type:'json_schema',json_schema:{name:schemaName,strict:true,schema}}};
  } else if(provider==='openai') {
    url='https://api.openai.com/v1/responses';headers={Authorization:`Bearer ${apiKey}`};
    body={model,input:messages,store:false,max_output_tokens:maxOutputTokens,reasoning:{effort:'low'},text:{format:{type:'json_schema',name:schemaName,strict:true,schema}}};
  } else if(provider==='claude') {
    url='https://api.anthropic.com/v1/messages';headers={'x-api-key':apiKey,'anthropic-version':'2023-06-01'};
    body={model,max_tokens:maxOutputTokens,system:systemPrompt,messages:messages.slice(1),output_config:{format:{type:'json_schema',schema}}};
  } else {
    url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;headers={'x-goog-api-key':apiKey};
    body={systemInstruction:{parts:[{text:systemPrompt}]},contents:[{role:'user',parts:[{text:summary}]}],generationConfig:{maxOutputTokens:maxOutputTokens,thinkingConfig:{thinkingLevel:'low'},responseMimeType:'application/json',responseJsonSchema:schema}};
  }
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(options.timeoutMs || 30000),redirect:'error'});
  if(!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error('Upstream request failed'),{code:'UPSTREAM_ERROR',upstreamStatus:response.status,retryAfter:parseRetryAfter(response.headers.get('Retry-After'))});
  }
  const result=await readProviderEnvelope(response);
  let content, complete=false, inputTokens, outputTokens;
  if(provider==='groq') {
    const choice=result.choices?.[0];content=choice?.message?.content;complete=choice?.finish_reason==='stop'&&!choice?.message?.refusal;
    inputTokens=result.usage?.prompt_tokens;outputTokens=result.usage?.completion_tokens;
  } else if(provider==='openai') {
    const parts=(result.output||[]).flatMap(x=>x.content||[]);
    content=parts.filter(p=>p.type==='output_text').map(p=>p.text).join('');complete=result.status==='completed'&&!parts.some(p=>p.type==='refusal');
    inputTokens=result.usage?.input_tokens;outputTokens=result.usage?.output_tokens;
  } else if(provider==='claude') {
    content=(result.content||[]).filter(p=>p.type==='text').map(p=>p.text).join('');complete=result.stop_reason==='end_turn';
    inputTokens=result.usage?.input_tokens;outputTokens=result.usage?.output_tokens;
  } else {
    const candidate=result.candidates?.[0];content=(candidate?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');complete=candidate?.finishReason==='STOP'&&!result.promptFeedback?.blockReason;
    inputTokens=result.usageMetadata?.promptTokenCount;outputTokens=(result.usageMetadata?.candidatesTokenCount||0)+(result.usageMetadata?.thoughtsTokenCount||0);
  }
  if(!complete||typeof content!=='string'||!content.trim()||content.length>(options.maxContentChars || 10000)) throw Object.assign(new Error('Incomplete response'),{code:'INCOMPLETE_OUTPUT'});
  const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
  return {content,model,usage:{inputTokens:count(inputTokens),outputTokens:count(outputTokens)}};
}
