/** 其他 /api/* 路徑一律回 JSON 404，對齊 server.js 的 API 404 處理。 */
import { json } from "../_lib/http.js";

export async function onRequest() {
  return json({ success: false, error: "API 端點不存在" }, 404);
}
