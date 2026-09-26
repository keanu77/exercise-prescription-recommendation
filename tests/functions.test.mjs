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
  assert.ok(summary.includes("運動時感到胸痛"));
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
  let r = await asJson(await post({ userData: GOOD, provider: "claude", model: "claude-3-opus-20240229" }, { ANTHROPIC_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 400);
  assert.match(r.body.error, /允許清單/);

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

test("MODEL_ALLOWLIST 每家都含 DEFAULT_MODELS", () => {
  for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
    assert.ok(MODEL_ALLOWLIST[provider].includes(model), `${provider} default not in allowlist`);
  }
});
