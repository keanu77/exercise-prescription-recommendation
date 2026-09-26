/**
 * Pages Functions 共用 HTTP 工具：JSON 回應、CORS、KV 速率限制。
 */

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function parseOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CORS 規則：
 * - 無 Origin（非瀏覽器或同站 GET）→ 放行
 * - 同源（scheme + host + port 完全相同）→ 放行
 * - 跨來源僅放行 ALLOWED_ORIGINS 白名單（逗號分隔完整 origin）
 * 回傳 null 代表放行但不需加 CORS 標頭；回傳物件代表要加的標頭；回傳 false 代表拒絕。
 * 注意：CORS 只約束瀏覽器，不是授權機制；非瀏覽器用戶端仍可直接呼叫。
 */
export function corsHeadersFor(request, env) {
  const originHeader = request.headers.get("Origin");
  if (!originHeader) return null;

  const origin = parseOrigin(originHeader);
  if (!origin) return false;
  if (origin === new URL(request.url).origin) return null;

  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => parseOrigin(o.trim()))
    .filter(Boolean);
  if (allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return false;
}

/** 供簡單 GET 路由共用：先做 CORS 判斷，再交給 handler。 */
export function withCors(handler) {
  return async (context) => {
    const cors = corsHeadersFor(context.request, context.env);
    if (cors === false) {
      return json({ success: false, error: "來源不被允許" }, 403);
    }
    const response = await handler(context);
    if (cors) {
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
    }
    return response;
  };
}

export async function corsPreflight({ request, env }) {
  const cors = corsHeadersFor(request, env);
  if (cors === false) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors || {} });
}

/**
 * KV 固定視窗速率限制（每個 IP 每 windowSeconds 最多 limit 次）。
 * 這是「盡力而為」的限流：KV 為最終一致、get→put 非原子，並行請求可能略超上限。
 * 回傳 degraded=true 代表 KV 未綁定或讀寫失敗、本次無法確認限流；
 * 呼叫端決定是否 fail-closed（例如使用站方金鑰時）。
 */
export async function checkRateLimit(request, env, { scope, limit, windowSeconds }) {
  const kv = env.RATE_LIMIT_KV;
  if (!kv) return { allowed: true, remaining: null, degraded: true };

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `${scope}:${ip}:${bucket}`;

  let count = 0;
  try {
    count = parseInt((await kv.get(key)) || "0", 10) || 0;
  } catch (err) {
    console.warn("rate-limit KV read failed:", err?.message);
    return { allowed: true, remaining: null, degraded: true };
  }
  if (count >= limit) return { allowed: false, remaining: 0, degraded: false };

  try {
    await kv.put(key, String(count + 1), { expirationTtl: windowSeconds * 2 });
  } catch (err) {
    console.warn("rate-limit KV write failed:", err?.message);
    return { allowed: true, remaining: null, degraded: true };
  }
  return { allowed: true, remaining: limit - count - 1, degraded: false };
}

export function providerAvailability(env) {
  return {
    groq: !!env.GROQ_API_KEY,
    claude: !!env.ANTHROPIC_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
    openai: !!env.OPENAI_API_KEY,
  };
}
