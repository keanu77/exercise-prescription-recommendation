#!/usr/bin/env node
/**
 * 本機開發伺服器（不是線上路徑；線上是 Cloudflare Pages + Functions）。
 * 直接載入 functions/api/*.js 的 handler，零第三方依賴、可離線跑。
 * - 靜態檔：只提供 html/js/css/圖片，不提供 .env、package.json 等
 * - /api/*：轉成 Fetch API 的 Request 交給 Pages Functions handler
 * - RATE_LIMIT_KV：以記憶體 Map 模擬（重啟即清空）
 * 金鑰從 .env 讀取（GROQ_API_KEY 等，見 .env.example）。
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  onRequestPost as aiPost,
  onRequestOptions as aiOptions,
} from "../functions/api/ai-recommendation.js";
import { onRequestGet as healthGet } from "../functions/api/health.js";
import { onRequestGet as providersGet } from "../functions/api/providers.js";
import { onRequest as apiNotFound } from "../functions/api/[[path]].js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

const ROUTES = {
  "/api/ai-recommendation": { POST: aiPost, OPTIONS: aiOptions },
  "/api/health": { GET: healthGet },
  "/api/providers": { GET: providersGet },
};

async function loadDotEnv() {
  let text;
  try {
    text = await readFile(path.join(ROOT, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function createMemoryKv() {
  const store = new Map();
  return {
    async get(key) {
      const entry = store.get(key);
      return entry && entry.expiresAt > Date.now() ? entry.value : null;
    },
    async put(key, value, { expirationTtl = 120 } = {}) {
      store.set(key, { value, expiresAt: Date.now() + expirationTtl * 1000 });
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handleApi(req, url, env) {
  const hasBody = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? await readBody(req) : undefined,
  });
  const handler = ROUTES[url.pathname]?.[req.method] || apiNotFound;
  return handler({ request, env });
}

async function serveStatic(url) {
  let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  if (pathname === "/parq-form") pathname = "/parq-form.html";
  const ext = path.extname(pathname);
  if (!MIME[ext] || pathname.includes("/.")) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(ROOT, path.normalize(pathname));
  if (!file.startsWith(ROOT + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    return new Response(await readFile(file), {
      headers: { "Content-Type": MIME[ext], "Cache-Control": "no-cache" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function sendResponse(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

await loadDotEnv();
const env = { ...process.env, RATE_LIMIT_KV: createMemoryKv() };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  try {
    const response = url.pathname.startsWith("/api/")
      ? await handleApi(req, url, env)
      : await serveStatic(url);
    await sendResponse(res, response);
  } catch (error) {
    console.error(`${req.method} ${url.pathname} failed:`, error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: "伺服器內部錯誤" }));
  }
}).listen(PORT, HOST, () => {
  const keys = ["GROQ_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY"]
    .filter((k) => env[k])
    .join(", ");
  console.log(`dev server: http://${HOST}:${PORT}  (AI keys: ${keys || "none"})`);
});
