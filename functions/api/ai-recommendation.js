/**
 * POST /api/ai-recommendation — Cloudflare Pages Function 版本。
 * 行為對齊 server.js 的同名端點：驗證 → 建摘要 → 依 provider 呼叫 AI → 統一 JSON 回應。
 * 金鑰來自 Pages 專案的 Secrets（GROQ_API_KEY 等），使用者也可自帶 customApiKey。
 */
import {
  validateUserData,
  sanitizeApiKey,
  buildUserSummary,
  DEFAULT_MODELS,
  callGroqAPI,
  callClaudeAPI,
  callGeminiAPI,
  callOpenAIAPI,
} from "../_lib/ai.js";
import { json, corsHeadersFor, checkRateLimit } from "../_lib/http.js";

const MAX_BODY_BYTES = 100 * 1024; // 對齊 express.json({ limit: "100kb" })
const VALID_PROVIDERS = ["auto", "groq", "claude", "gemini", "openai"];

const CALLERS = {
  groq: { call: callGroqAPI, envKey: "GROQ_API_KEY", label: "Groq", missing: "未設定 Groq API 金鑰", missingStatus: 500 },
  claude: { call: callClaudeAPI, envKey: "ANTHROPIC_API_KEY", label: "Claude", missing: "請提供 Claude API 金鑰", missingStatus: 400 },
  gemini: { call: callGeminiAPI, envKey: "GEMINI_API_KEY", label: "Gemini", missing: "請提供 Gemini API 金鑰", missingStatus: 400 },
  openai: { call: callOpenAIAPI, envKey: "OPENAI_API_KEY", label: "OpenAI", missing: "請提供 OpenAI API 金鑰", missingStatus: 400 },
};
const AUTO_ORDER = ["groq", "claude", "gemini", "openai"];

export async function onRequestOptions({ request, env }) {
  const cors = corsHeadersFor(request, env);
  if (cors === false) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors || {} });
}

export async function onRequestPost({ request, env }) {
  const cors = corsHeadersFor(request, env);
  if (cors === false) {
    return json({ success: false, error: "來源不被允許" }, 403);
  }
  const extra = cors || {};

  const rl = await checkRateLimit(request, env, {
    scope: "ai",
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return json(
      { success: false, error: "請求過於頻繁，請稍後再試（每分鐘最多 10 次）" },
      429,
      { ...extra, "Retry-After": "60" },
    );
  }

  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (len > MAX_BODY_BYTES) {
    return json({ success: false, error: "請求內容過大" }, 413, extra);
  }

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ success: false, error: "請求內容過大" }, 413, extra);
    }
    payload = JSON.parse(raw);
  } catch {
    return json({ success: false, error: "請求格式錯誤（需為 JSON）" }, 400, extra);
  }

  const { userData, provider = "auto", model = null, customApiKey = null } = payload || {};

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

  const sanitizedApiKey = customApiKey ? sanitizeApiKey(customApiKey) : null;
  const userSummary = buildUserSummary(userData);

  try {
    let chosen;
    let apiKey;
    let chosenModel;

    if (provider === "auto") {
      chosen = AUTO_ORDER.find((p) => env[CALLERS[p].envKey]);
      if (!chosen) {
        return json({ success: false, error: "未設定任何 AI API 金鑰" }, 500, extra);
      }
      apiKey = env[CALLERS[chosen].envKey];
      chosenModel = DEFAULT_MODELS[chosen];
    } else {
      chosen = provider;
      apiKey = sanitizedApiKey || env[CALLERS[chosen].envKey];
      if (!apiKey) {
        return json(
          { success: false, error: CALLERS[chosen].missing },
          CALLERS[chosen].missingStatus,
          extra,
        );
      }
      chosenModel = model || DEFAULT_MODELS[chosen];
    }

    const result = await CALLERS[chosen].call(userSummary, apiKey, chosenModel);
    return json(
      {
        success: true,
        recommendation: result.content,
        provider: `${CALLERS[chosen].label} (${result.model})`,
        model: result.model,
      },
      200,
      extra,
    );
  } catch (error) {
    console.error("AI 建議生成錯誤:", error?.name, error?.message);
    let safeErrorMessage;
    let statusCode = 500;
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      safeErrorMessage = "AI 回應逾時，請稍後再試一次";
      statusCode = 504;
    } else if (error?.message?.includes("API")) {
      safeErrorMessage = "AI 服務暫時無法使用，請檢查 API 金鑰是否正確";
    } else {
      safeErrorMessage = "AI 服務暫時無法使用，請稍後再試";
    }
    return json({ success: false, error: safeErrorMessage }, statusCode, extra);
  }
}
