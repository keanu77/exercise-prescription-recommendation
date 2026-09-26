/**
 * POST /api/ai-recommendation — Cloudflare Pages Function。
 * 流程：CORS → 讀 body → 驗證並正規化 → 限流 → 依 provider 呼叫 AI → 統一 JSON 回應。
 * 金鑰來自 Pages 專案的 Secrets（GROQ_API_KEY 等），使用者也可自帶 customApiKey。
 */
import {
  validateUserData,
  sanitizeApiKey,
  buildUserSummary,
  DEFAULT_MODELS,
  MODEL_ALLOWLIST,
  callGroqAPI,
  callClaudeAPI,
  callGeminiAPI,
  callOpenAIAPI,
} from "../_lib/ai.js";
import { json, corsHeadersFor, corsPreflight, checkRateLimit } from "../_lib/http.js";

const MAX_BODY_BYTES = 100 * 1024;
const VALID_PROVIDERS = ["auto", "groq", "claude", "gemini", "openai"];
const RATE_LIMIT = { scope: "ai", limit: 10, windowSeconds: 60 };

const CALLERS = {
  groq: { call: callGroqAPI, envKey: "GROQ_API_KEY", label: "Groq", missing: "未設定 Groq API 金鑰", missingStatus: 500 },
  claude: { call: callClaudeAPI, envKey: "ANTHROPIC_API_KEY", label: "Claude", missing: "請提供 Claude API 金鑰", missingStatus: 400 },
  gemini: { call: callGeminiAPI, envKey: "GEMINI_API_KEY", label: "Gemini", missing: "請提供 Gemini API 金鑰", missingStatus: 400 },
  openai: { call: callOpenAIAPI, envKey: "OPENAI_API_KEY", label: "OpenAI", missing: "請提供 OpenAI API 金鑰", missingStatus: 400 },
};
const AUTO_ORDER = ["groq", "claude", "gemini", "openai"];

export const onRequestOptions = corsPreflight;

async function readJsonBody(request) {
  const declared = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (declared > MAX_BODY_BYTES) return { error: "請求內容過大", status: 413 };

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return { error: "請求內容過大", status: 413 };
  }
  try {
    return { payload: JSON.parse(raw) };
  } catch {
    return { error: "請求格式錯誤（需為 JSON）", status: 400 };
  }
}

function resolveProvider({ provider, model, sanitizedApiKey, env }) {
  if (provider === "auto") {
    const chosen = AUTO_ORDER.find((p) => env[CALLERS[p].envKey]);
    if (!chosen) return { error: "未設定任何 AI API 金鑰", status: 500 };
    return { chosen, apiKey: env[CALLERS[chosen].envKey], chosenModel: DEFAULT_MODELS[chosen] };
  }

  const apiKey = sanitizedApiKey || env[CALLERS[provider].envKey];
  if (!apiKey) {
    return { error: CALLERS[provider].missing, status: CALLERS[provider].missingStatus };
  }
  const chosenModel = model || DEFAULT_MODELS[provider];
  if (!MODEL_ALLOWLIST[provider].includes(chosenModel)) {
    return { error: "指定的模型不在允許清單內", status: 400 };
  }
  return { chosen: provider, apiKey, chosenModel };
}

function describeUpstreamError(error, usingOwnKey) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return { message: "AI 回應逾時，請稍後再試一次", status: 504 };
  }
  const upstream = error?.upstreamStatus;
  if (upstream === 401 || upstream === 403) {
    return usingOwnKey
      ? { message: "API 金鑰無效或沒有權限，請確認後再試", status: 400 }
      : { message: "AI 服務設定異常，請稍後再試或改用自己的 API 金鑰", status: 502 };
  }
  if (upstream === 429) {
    return { message: "AI 服務目前流量過大，請稍後再試", status: 503 };
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

  const { userData, provider = "auto", model = null, customApiKey = null } = body.payload || {};

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

  // 限流放在驗證之後：無效請求不消耗 KV 寫入額度
  const rl = await checkRateLimit(request, env, RATE_LIMIT);
  if (!rl.allowed) {
    return json(
      { success: false, error: "請求過於頻繁，請稍後再試（每分鐘最多 10 次）" },
      429,
      { ...extra, "Retry-After": "60" },
    );
  }
  // 限流服務不可用時，站方金鑰一律 fail-closed；自帶金鑰者成本自負，照常放行
  if (rl.degraded && !sanitizedApiKey) {
    return json(
      { success: false, error: "AI 服務暫時無法使用，請稍後再試或使用自己的 API 金鑰" },
      503,
      { ...extra, "Retry-After": "60" },
    );
  }

  const resolved = resolveProvider({ provider, model, sanitizedApiKey, env });
  if (resolved.error) {
    return json({ success: false, error: resolved.error }, resolved.status, extra);
  }
  const { chosen, apiKey, chosenModel } = resolved;

  try {
    const userSummary = buildUserSummary(validation.data);
    const result = await CALLERS[chosen].call(userSummary, apiKey, chosenModel);
    return json(
      {
        success: true,
        recommendation: result.content,
        provider: `${CALLERS[chosen].label} (${result.model})`,
        model: result.model,
        truncated: Boolean(result.truncated),
      },
      200,
      extra,
    );
  } catch (error) {
    console.error("AI 建議生成錯誤:", error?.name, error?.message);
    const { message, status } = describeUpstreamError(error, Boolean(sanitizedApiKey));
    return json({ success: false, error: message }, status, extra);
  }
}
