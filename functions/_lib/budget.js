// KV is eventually consistent: this is a conservative daily spending guard,
// NOT an atomic hard billing cap. Also set provider account limits for a hard cap.
// Reserve maximum input/output cost before calling; failed requests retain reservation.
import { COACHING_MAX_OUTPUT_TOKENS } from './coaching-limits.js';
export async function reserveSiteBudget(env, model, inputTokenBound = 12000, outputTokenBound = COACHING_MAX_OUTPUT_TOKENS) {
  const kv=env.RATE_LIMIT_KV;
  const raw=env.AI_DAILY_BUDGET_USD ?? '2';
  const limit=Number(raw);
  if(!kv || !Number.isFinite(limit)||limit<=0||limit>10) return {allowed:false,error:'AI 每日額度設定暫時無法使用',retryAfter:60};
  const today=new Date().toISOString().slice(0,10);
  const retryAfter=Math.ceil((Date.parse(today+'T00:00:00Z')+86400000-Date.now())/1000);
  const key='ai-budget:'+today;
  const reservation=(inputTokenBound*model.inputUSD+outputTokenBound*model.outputUSD)/1e6;
  try {
    const spent=Number(await kv.get(key)||0);
    if(!Number.isFinite(spent)||spent<0) throw new Error('budget unavailable');
    if(spent+reservation>limit) return {allowed:false,error:'本站今日 AI 額度已用完，標準處方仍可使用；亦可改用自己的 API 金鑰',retryAfter};
    await kv.put(key,String(spent+reservation),{expirationTtl:172800});
    return {allowed:true};
  } catch {return {allowed:false,error:'AI 額度暫時無法確認，請稍後再試',retryAfter:60};}
}
