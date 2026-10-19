/** GET /api/providers — 可用提供商查詢（只回布林，不含金鑰）。 */
import { json, withCors, corsPreflight } from "../_lib/http.js";

import { publicCatalog } from "../_lib/models.js";
export const onRequestOptions = corsPreflight;
export const onRequestGet = withCors(async ({ env }) => json(publicCatalog(env)));
