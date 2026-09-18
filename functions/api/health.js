/** GET /api/health — 對齊 server.js 的健康檢查回應格式。 */
import { json, providerAvailability } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  return json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiProviders: providerAvailability(env),
  });
}
