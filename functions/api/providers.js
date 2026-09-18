/** GET /api/providers — 對齊 server.js 的可用提供商查詢。 */
import { json, providerAvailability } from "../_lib/http.js";

const ORDER = ["groq", "claude", "gemini", "openai"];

export async function onRequestGet({ env }) {
  const available = providerAvailability(env);
  return json({
    available,
    defaultProvider: ORDER.find((p) => available[p]) || null,
  });
}
