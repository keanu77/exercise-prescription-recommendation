/**
 * Pages Functions 共用 HTTP 工具：JSON 回應、CORS、KV 速率限制。
 * 對應 server.js 的 helmet / cors / express-rate-limit 三段設定。
 */

const stripSlash = (o) => o.replace(/\/+$/, "");

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

/**
 * 與 server.js 相同的 CORS 規則：
 * - 無 Origin / 同站 Origin → 放行
 * - 跨來源僅放行 ALLOWED_ORIGINS 白名單
 * 回傳 null 代表放行但不需加 CORS 標頭；回傳物件代表要加的標頭；回傳 false 代表拒絕。
 */
export function corsHeadersFor(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get("Host") || new URL(request.url).host;
  if (originHost === host) return null;

  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => stripSlash(o.trim()))
    .filter(Boolean);
  if (allowed.includes(stripSlash(origin))) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return false;
}

/**
 * KV 固定視窗速率限制（每個 IP 每 windowSeconds 最多 limit 次）。
 * KV 未綁定時優雅降級：不限制但回傳 allowed=true。
 * 免費方案 KV 每日寫入 1,000 次；AI 請求量低，一次請求只寫 1 筆，足夠。
 */
export async function checkRateLimit(request, env, { scope, limit, windowSeconds }) {
  const kv = env.RATE_LIMIT_KV;
  if (!kv) return { allowed: true, remaining: null };

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `${scope}:${ip}:${bucket}`;

  let count = 0;
  try {
    count = parseInt((await kv.get(key)) || "0", 10) || 0;
  } catch (err) {
    console.warn("rate-limit KV read failed, fail-open:", err?.message);
    return { allowed: true, remaining: null };
  }
  if (count >= limit) return { allowed: false, remaining: 0 };

  try {
    await kv.put(key, String(count + 1), { expirationTtl: windowSeconds * 2 });
  } catch (err) {
    console.warn("rate-limit KV write failed, fail-open:", err?.message);
  }
  return { allowed: true, remaining: limit - count - 1 };
}

export function providerAvailability(env) {
  return {
    groq: !!env.GROQ_API_KEY,
    claude: !!env.ANTHROPIC_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
    openai: !!env.OPENAI_API_KEY,
  };
}
