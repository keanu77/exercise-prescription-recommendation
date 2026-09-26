/**
 * Pages Functions 單元測試：npm test（node --test）。
 * 不打真實上游：以 globalThis.fetch mock 各家 API。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateUserData,
  buildUserSummary,
  MODEL_ALLOWLIST,
  DEFAULT_MODELS,
} from "../functions/_lib/ai.js";
import { corsHeadersFor } from "../functions/_lib/http.js";
import { onRequestPost } from "../functions/api/ai-recommendation.js";

const GOOD = {
  age: 35,
  gender: "male",
  height: 170,
  weight: 70,
  health_status: "healthy",
  diseases: ["hypertension"],
  fitness_level: "good",
  exercise_habit: "moderate",
  exercise_goal: "health",
  limitations: [],
  parq_answers: { parq_q1: "no", parq_q2: "yes", parq_q6: "no" },
  prescription: { frequency: 3, time: 20, intensity: "light", type: ["有氧運動", "肌力訓練"], volume: 150 },
};

const KV_OK = { get: async () => "0", put: async () => {} };
const KV_FULL = { get: async () => "10", put: async () => {} };
const KV_READ_FAIL = { get: async () => { throw new Error("unavailable"); }, put: async () => {} };
const KV_WRITE_FAIL = { get: async () => "0", put: async () => { throw new Error("quota"); } };

function post(body, env) {
  const request = new Request("https://example.com/api/ai-recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return onRequestPost({ request, env });
}
async function asJson(response) {
  return { status: response.status, body: await response.json() };
}

test("validateUserData: 合法輸入正規化並由伺服器算 BMI", () => {
  const v = validateUserData(GOOD);
  assert.equal(v.valid, true, v.errors.join("|"));
  assert.equal(v.data.bmi, 24.2);
  assert.equal(v.data.parq_answers.parq_q2, "yes");
});

test("validateUserData: 拒絕數字前綴、非法 enum、非法 prescription", () => {
  assert.equal(validateUserData({ ...GOOD, age: "35 INJECT" }).valid, false);
  assert.equal(validateUserData({ ...GOOD, diseases: ["not_a_disease"] }).valid, false);
  assert.equal(validateUserData({ ...GOOD, exercise_goal: "hack" }).valid, false);
  assert.equal(
    validateUserData({ ...GOOD, prescription: { ...GOOD.prescription, type: [{ toString: null }] } }).valid,
    false,
  );
  assert.equal(
    validateUserData({ ...GOOD, prescription: { ...GOOD.prescription, intensity: "輕度 (50-60% HRmax)" } }).valid,
    false,
  );
  const missing = validateUserData({ prescription: { type: [], frequency: 1, time: 1, intensity: 1 } });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.some((e) => e.includes("年齡")));
});

test("buildUserSummary: 逐題列出 PAR-Q 為「是」的項目且無 undefined", () => {
  const summary = buildUserSummary(validateUserData(GOOD).data);
  assert.ok(summary.includes("身體活動時會胸痛"));
  assert.ok(summary.includes("高風險"));
  assert.ok(!summary.includes("undefined"));
});

test("corsHeadersFor: 比對完整 origin（含 scheme）", () => {
  const req = (origin) =>
    new Request("https://example.com/api/x", { headers: origin ? { Origin: origin } : {} });
  assert.equal(corsHeadersFor(req("http://example.com"), {}), false);
  assert.equal(corsHeadersFor(req("https://example.com"), {}), null);
  assert.equal(corsHeadersFor(req(null), {}), null);
  assert.equal(corsHeadersFor(req("https://evil.com"), { ALLOWED_ORIGINS: "https://good.com/" }), false);
  assert.equal(
    corsHeadersFor(req("https://good.com"), { ALLOWED_ORIGINS: "https://good.com/" })["Access-Control-Allow-Origin"],
    "https://good.com",
  );
});

test("handler: 驗證與白名單在限流之前", async () => {
  let rateLimitCalls = 0;
  const kv = { get: async () => { rateLimitCalls++; return "0"; }, put: async () => {} };
  let r = await asJson(await post({ userData: GOOD, provider: "claude", model: "claude-3-opus-20240229" }, { ANTHROPIC_API_KEY: "k", RATE_LIMIT_KV: kv }));
  assert.equal(r.status, 400);
  assert.match(r.body.error, /允許清單/);
  assert.equal(rateLimitCalls, 0);

  r = await asJson(await post({ userData: { ...GOOD, age: "abc" } }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 400);

  r = await asJson(await post({ userData: GOOD, model: 123 }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 400);

  r = await asJson(await post({ userData: GOOD, provider: "auto" }, { RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 500);
});

test("handler: 限流 429；KV 不可用時站方金鑰 fail-closed、自帶金鑰放行", async () => {
  let r = await asJson(await post({ userData: GOOD }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_FULL }));
  assert.equal(r.status, 429);

  r = await asJson(await post({ userData: GOOD, provider: "groq" }, { GROQ_API_KEY: "k" }));
  assert.equal(r.status, 503);

  r = await asJson(await post({ userData: GOOD, provider: "groq" }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_WRITE_FAIL }));
  assert.equal(r.status, 503);
});

test("handler: auto 附帶任意金鑰不能繞過 KV 缺失、讀取或寫入失敗", async (t) => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls++;
    return Response.json({ choices: [{ message: { content: "mock" }, finish_reason: "stop" }] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  for (const kv of [undefined, KV_READ_FAIL, KV_WRITE_FAIL]) {
    const r = await post(
      { userData: GOOD, provider: "auto", customApiKey: "x" },
      { GROQ_API_KEY: "site-key-fixture", RATE_LIMIT_KV: kv },
    );
    assert.equal(r.status, 503);
    assert.equal(r.headers.get("Retry-After"), "60");
  }
  assert.equal(upstreamCalls, 0);
});

test("handler: explicit BYOK 在 KV 故障時只把自帶金鑰送往上游", async (t) => {
  const originalFetch = globalThis.fetch;
  const authorizations = [];
  globalThis.fetch = async (_url, init) => {
    authorizations.push(init.headers.Authorization);
    return Response.json({ choices: [{ message: { content: "mock" }, finish_reason: "stop" }] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  for (const kv of [undefined, KV_READ_FAIL, KV_WRITE_FAIL]) {
    const r = await post(
      { userData: GOOD, provider: "groq", customApiKey: "own-key-fixture" },
      { GROQ_API_KEY: "site-key-fixture", RATE_LIMIT_KV: kv },
    );
    assert.equal(r.status, 200);
  }
  assert.deepEqual(authorizations, Array(3).fill("Bearer own-key-fixture"));
});

test("handler: auto 的站方金鑰 401 不誤判為自帶金鑰錯誤", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.Authorization, "Bearer site-key-fixture");
    return new Response("invalid key", { status: 401 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const r = await asJson(await post(
    { userData: GOOD, provider: "auto", customApiKey: "x" },
    { GROQ_API_KEY: "site-key-fixture", RATE_LIMIT_KV: KV_OK },
  ));
  assert.equal(r.status, 502);
  assert.match(r.body.error, /服務設定異常/);
});

test("handler: 上游成功 / 截斷 / 401 / 空內容 / Gemini 路徑", async (t) => {
  const originalFetch = globalThis.fetch;
  let geminiUrl = "";
  let geminiBody = null;
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    if (target.includes("groq")) {
      return new Response(JSON.stringify({ choices: [{ message: { content: "<div class='ai-section'><p>hi</p></div>" }, finish_reason: "length" }] }), { status: 200 });
    }
    if (target.includes("anthropic")) return new Response("upstream html error", { status: 401 });
    if (target.includes("openai")) {
      return new Response(JSON.stringify({ choices: [{ message: { content: "   " }, finish_reason: "stop" }] }), { status: 200 });
    }
    if (target.includes("googleapis")) {
      geminiUrl = target;
      geminiBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }] }), { status: 200 });
    }
    return new Response("{}", { status: 500 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  let r = await asJson(await post({ userData: GOOD, provider: "auto" }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 200);
  assert.equal(r.body.truncated, true);
  assert.equal(r.body.model, DEFAULT_MODELS.groq);

  r = await asJson(await post({ userData: GOOD, provider: "claude", customApiKey: "sk-ant-abc" }, { RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 400);
  assert.match(r.body.error, /金鑰無效/);

  r = await asJson(await post({ userData: GOOD, provider: "claude" }, { ANTHROPIC_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 502);
  assert.doesNotMatch(r.body.error, /金鑰無效/);

  r = await asJson(await post({ userData: GOOD, provider: "openai", customApiKey: "sk-x" }, { RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 502);

  r = await asJson(await post({ userData: GOOD, provider: "gemini", model: "gemini-2.5-pro", customApiKey: "g" }, { RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 200);
  assert.ok(geminiUrl.includes("gemini-2.5-pro:generateContent"));
  assert.ok(geminiBody.systemInstruction);

  r = await asJson(await post({ userData: GOOD, provider: "groq", customApiKey: "gsk_x" }, { RATE_LIMIT_KV: KV_WRITE_FAIL }));
  assert.equal(r.status, 200);
});

test("handler: 超過 100KB 回 413", async () => {
  const r = await asJson(await post({ userData: { ...GOOD, pad: "x".repeat(120 * 1024) } }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 413);
});

test("handler: 無 Content-Length 的超量串流提早取消，不讀完內容", async () => {
  let chunksProduced = 0;
  let canceled = false;
  const chunk = new Uint8Array(64 * 1024).fill(32);
  const stream = new ReadableStream({
    pull(controller) {
      if (chunksProduced === 32) return controller.close();
      chunksProduced++;
      controller.enqueue(chunk);
    },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 });
  const request = new Request("https://example.com/api/ai-recommendation", {
    method: "POST", body: stream, duplex: "half",
  });
  const response = await onRequestPost({ request, env: {} });
  assert.equal(response.status, 413);
  assert.equal(canceled, true);
  assert.ok(chunksProduced <= 2, `read ${chunksProduced} chunks before stopping`);
});

test("handler: Content-Length 已超量時直接取消 body", async () => {
  let read = false;
  let canceled = false;
  const stream = new ReadableStream({
    pull(controller) { read = true; controller.close(); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 });
  const request = new Request("https://example.com/api/ai-recommendation", {
    method: "POST", headers: { "Content-Length": String(100 * 1024 + 1) },
    body: stream, duplex: "half",
  });
  const response = await onRequestPost({ request, env: {} });
  assert.equal(response.status, 413);
  assert.equal(read, false);
  assert.equal(canceled, true);
});

test("handler: 串流正確還原跨 chunk 的 UTF-8，且接受恰好 100KiB", async (t) => {
  const originalFetch = globalThis.fetch;
  let upstreamSummary;
  globalThis.fetch = async (_url, init) => {
    upstreamSummary = JSON.parse(init.body).messages[1].content;
    return Response.json({ choices: [{ message: { content: "mock" }, finish_reason: "stop" }] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const encoder = new TextEncoder();
  const jsonText = JSON.stringify({ userData: GOOD, provider: "groq", customApiKey: "own-key-fixture" });
  const bytes = encoder.encode(jsonText + " ".repeat(100 * 1024 - encoder.encode(jsonText).length));
  const split = encoder.encode(jsonText.slice(0, jsonText.indexOf("有氧運動"))).length + 1;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, split));
      controller.enqueue(bytes.slice(split));
      controller.close();
    },
  });
  const request = new Request("https://example.com/api/ai-recommendation", {
    method: "POST", body: stream, duplex: "half",
  });
  const response = await onRequestPost({ request, env: {} });
  assert.equal(response.status, 200);
  assert.match(upstreamSummary, /有氧運動/);
  assert.doesNotMatch(upstreamSummary, /\uFFFD/);
});

test("handler: 空白、非法 JSON/UTF-8、串流讀取錯誤都回 JSON 400", async () => {
  const broken = new ReadableStream({
    pull(controller) { controller.error(new Error("body interrupted")); },
  });
  for (const body of [undefined, "", "{invalid", new Uint8Array([0xff]), broken]) {
    const request = new Request("https://example.com/api/ai-recommendation", {
      method: "POST", body, duplex: "half",
    });
    const response = await onRequestPost({ request, env: {} });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
  }
});

test("MODEL_ALLOWLIST 每家都含 DEFAULT_MODELS", () => {
  for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
    assert.ok(MODEL_ALLOWLIST[provider].includes(model), `${provider} default not in allowlist`);
  }
});
