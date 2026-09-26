/** GET /api/providers — 可用提供商查詢（只回布林，不含金鑰）。 */
import { json, providerAvailability, withCors, corsPreflight } from "../_lib/http.js";

const ORDER = ["groq", "claude", "gemini", "openai"];

export const onRequestOptions = corsPreflight;

export const onRequestGet = withCors(async ({ env }) => {
  const available = providerAvailability(env);
  return json({
    available,
    defaultProvider: ORDER.find((p) => available[p]) || null,
  });
});
