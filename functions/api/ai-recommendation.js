/**
 * POST /api/ai-recommendation — Cloudflare Pages Function。
 * 流程：CORS → 讀 body → 驗證並正規化 → 限流 → 依 provider 呼叫 AI → 統一 JSON 回應。
 * 金鑰來自 Pages 專案的 Secrets（GROQ_API_KEY 等），使用者也可自帶 customApiKey。
 */
import { validateUserData, sanitizeApiKey } from "../_lib/ai.js";
import { MODELS, DEFAULT_MODELS, MODEL_ALLOWLIST, publicCatalog } from "../_lib/models.js";
import { validateCoachingContext, buildCoachingContext, buildCoachingPrompt, coachingSchema, presentCoaching, COACHING_SYSTEM_PROMPT, RULES_VERSION, PROMPT_VERSION } from "../_lib/coaching.js";
import { coachingTokenReservation } from "../_lib/coaching-limits.js";
import { runCoaching } from "../_lib/coaching-runner.js";
import { safeOutputDiagnostic } from "../_lib/ai-diagnostics.js";
import { reserveSiteBudget } from "../_lib/budget.js";
import { json, corsHeadersFor, corsPreflight, checkRateLimit } from "../_lib/http.js";

const MAX_BODY_BYTES = 100 * 1024;
const VALID_PROVIDERS = ["auto", "groq"];
const RATE_LIMIT = { scope: "ai", limit: 10, windowSeconds: 60 };

export const onRequestOptions = corsPreflight;

async function readJsonBody(request) {
  const declared = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (declared > MAX_BODY_BYTES) {
    await request.body?.cancel().catch(() => {});
    return { error: "請求內容過大", status: 413 };
  }

  let reader;
  try {
    if (!request.body) return { error: "請求格式錯誤（需為 JSON）", status: 400 };
    reader = request.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytesRead = 0;
    let raw = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { error: "請求內容過大", status: 413 };
      }
      // 逐塊解碼保留跨 chunk 的 UTF-8 字元；只保留上限內的資料。
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return { payload: JSON.parse(raw) };
  } catch {
    await reader?.cancel().catch(() => {});
    return { error: "請求格式錯誤（需為 JSON）", status: 400 };
  } finally {
    reader?.releaseLock();
  }
}

function resolveProvider({ provider, model, sanitizedApiKey, env }) {
  const chosen = provider === "auto" ? publicCatalog(env).defaultProvider : provider;
  if (!chosen) return { error: "目前沒有可用的站方 AI 服務，請使用自己的金鑰", status: 503 };
  const chosenModel = provider === "auto" ? DEFAULT_MODELS[chosen] : (model || DEFAULT_MODELS[chosen]);
  if (!MODEL_ALLOWLIST[chosen].includes(chosenModel)) return { error: "指定的模型不在允許清單內", status: 400 };
  const modelInfo = MODELS[chosen].models.find(m=>m.id===chosenModel);
  const usingOwnKey = provider !== "auto" && Boolean(sanitizedApiKey);
  if (!usingOwnKey && !modelInfo.siteEnabled) return {error:"此候選模型需使用自己的 API 金鑰；尚未完成本站品質評測",status:400};
  const apiKey = usingOwnKey ? sanitizedApiKey : env[MODELS[chosen].envKey];
  if (!apiKey) return {error:"請提供此服務的 API 金鑰",status:400};
  return {chosen,chosenModel,modelInfo,apiKey,usingOwnKey};
}

function describeUpstreamError(error, usingOwnKey) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return { message: "AI 回應逾時，請稍後再試一次", status: 504 };
  }
  if (["INVALID_OUTPUT", "INCOMPLETE_OUTPUT"].includes(error?.code) || error?.upstreamCode === "json_validate_failed") {
    return {message:"AI 回應未通過完整性檢查，請繼續參考上方處方，或稍後重試",status:502};
  }
  const upstream = error?.upstreamStatus;
  if (upstream === 401 || upstream === 403) {
    return usingOwnKey
      ? { message: "API 金鑰無效或沒有權限，請確認後再試", status: 400 }
      : { message: "AI 服務設定異常，請稍後再試或改用自己的 API 金鑰", status: 502 };
  }
  if (upstream === 429) {
    return { message: "AI 服務目前流量過大，請稍後再試", status: 429 };
  }
  if (upstream === 400 || upstream === 404) {
    return { message: "AI 服務拒絕此請求（模型可能已停用），請改選其他模型", status: 502 };
  }
  return { message: "AI 服務暫時無法使用，請稍後再試", status: 502 };
}

export async function onRequestPost({ request, env }) {
  const cors = corsHeadersFor(request, env);
  if (cors === false) {
    return json({ success: false, error: "來源不被允許" }, 403);
  }
  const extra = cors || {};

  const body = await readJsonBody(request);
  if (body.error) return json({ success: false, error: body.error }, body.status, extra);

  const { schemaVersion, userData, coachingContext, provider = "auto", model = null, customApiKey = null } = body.payload || {};

  if (schemaVersion !== 3) return json({success:false,error:"網站已更新，請重新整理頁面後再產生建議"},409,extra);
  if (!userData) {
    return json({ success: false, error: "缺少用戶資料" }, 400, extra);
  }
  const validation = validateUserData(userData);
  if (!validation.valid) {
    return json(
      { success: false, error: `資料驗證失敗: ${validation.errors.join(", ")}` },
      400,
      extra,
    );
  }
  const coachingValidation = validateCoachingContext(coachingContext);
  if (!coachingValidation.valid) return json({success:false,error:`生活情境驗證失敗: ${coachingValidation.errors.join(', ')}`},400,extra);
  if (!VALID_PROVIDERS.includes(provider)) {
    return json({ success: false, error: "AI 提供商選項無效" }, 400, extra);
  }
  if (model !== null && typeof model !== "string") {
    return json({ success: false, error: "模型參數格式錯誤" }, 400, extra);
  }
  const sanitizedApiKey = customApiKey ? sanitizeApiKey(customApiKey) : null;
  if (customApiKey && !sanitizedApiKey) {
    return json({ success: false, error: "API 金鑰格式無效" }, 400, extra);
  }

  const resolved = resolveProvider({ provider, model, sanitizedApiKey, env });
  if (resolved.error) {
    return json({ success: false, error: resolved.error }, resolved.status, extra);
  }
  const { chosen, apiKey, chosenModel, modelInfo, usingOwnKey } = resolved;

  // 限流放在驗證之後：無效請求不消耗 KV 寫入額度
  const rl = await checkRateLimit(request, env, RATE_LIMIT);
  if (!rl.allowed) {
    return json(
      { success: false, error: "請求過於頻繁，請稍後再試（每分鐘最多 10 次）" },
      429,
      { ...extra, "Retry-After": String(rl.retryAfter) },
    );
  }
  // 依實際使用的金鑰來源判斷：auto 永遠使用站方金鑰，即使請求附帶自帶金鑰。
  if (rl.degraded && !usingOwnKey) {
    return json(
      { success: false, retryScope: "site", error: "AI 服務暫時無法使用，請稍後再試或使用自己的 API 金鑰" },
      503,
      { ...extra, "Retry-After": "60" },
    );
  }

  const context = buildCoachingContext(validation.data, coachingValidation.data);
  const userSummary = buildCoachingPrompt(context);
  // UTF-8 bytes conservatively bound token count, plus protocol overhead.
  const inputTokenBound = new TextEncoder().encode(COACHING_SYSTEM_PROMPT + userSummary + JSON.stringify(coachingSchema())).byteLength + 1000;
  if (inputTokenBound > 48000) return json({success:false,error:"本次資料超過 AI 處理上限，請使用標準處方"},400,extra);
  if (!usingOwnKey) {
    const reservation = coachingTokenReservation(inputTokenBound);
    const budget = await reserveSiteBudget(env, modelInfo, reservation.inputTokens, reservation.outputTokens);
    if (!budget.allowed) return json({success:false,retryScope:"site",error:budget.error},503,{...extra,"Retry-After":String(budget.retryAfter)});
  }
  const started = Date.now();
  try {
    const { selection, omittedItems, usage, attempts } = await runCoaching({provider:chosen,summary:userSummary,apiKey,model:chosenModel,context});
    const estimatedCostUSD = usage.inputTokens === null || usage.outputTokens === null ? null :
      (usage.inputTokens * modelInfo.inputUSD + usage.outputTokens * modelInfo.outputUSD) / 1e6;
    const meta = {provider:chosen,model:chosenModel,promptVersion:PROMPT_VERSION,rulesVersion:RULES_VERSION,
      generatedAt:new Date().toISOString(),durationMs:Date.now()-started,usage,estimatedCostUSD,attempts,omittedItems};
    // Deliberately omit profile, prompt, selected actions, raw response and API key from logs.
    console.info(JSON.stringify({event:"ai_complete",...meta}));
    return json({success:true,schemaVersion:3,...presentCoaching(selection,context),meta},200,extra);
  } catch (error) {
    console.warn(JSON.stringify({event:"ai_error",provider:chosen,model:chosenModel,code:["INVALID_OUTPUT","INCOMPLETE_OUTPUT","UPSTREAM_ERROR"].includes(error?.code)?error.code:"REQUEST_FAILED",...safeOutputDiagnostic(error),upstreamCode:['json_validate_failed','json_schema_invalid','invalid_request_error','context_length_exceeded'].includes(error?.upstreamCode)?error.upstreamCode:null,status:Number.isInteger(error?.upstreamStatus)&&error.upstreamStatus>=100&&error.upstreamStatus<=599?error.upstreamStatus:null,durationMs:Date.now()-started}));
    const { message, status } = describeUpstreamError(error, usingOwnKey);
    const headers = error?.retryAfter !== null && error?.retryAfter !== undefined ? {...extra,"Retry-After":String(error.retryAfter)} : extra;
    return json({success:false,error:message},status,headers);
  }
}
