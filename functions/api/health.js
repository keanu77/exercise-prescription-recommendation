/** GET /api/health — 健康檢查與各 provider 金鑰是否已設定（只回布林）。 */
import { json, providerAvailability, withCors, corsPreflight } from "../_lib/http.js";

export const onRequestOptions = corsPreflight;

export const onRequestGet = withCors(async ({ env }) =>
  json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiProviders: providerAvailability(env),
  }),
);
