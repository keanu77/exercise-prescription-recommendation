/**
 * Pages Functions 單元測試：npm test（node --test）。
 * 不打真實上游：以 globalThis.fetch mock 各家 API。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateUserData,
  buildUserSummary,
  callProvider,
  parseRetryAfter,
  MODEL_ALLOWLIST,
  DEFAULT_MODELS,
} from "../functions/_lib/ai.js";
import { buildAdviceContext, validateSelection, presentAdvice, adviceSchema } from "../functions/_lib/advice.js";
import { publicCatalog, MODELS } from "../functions/_lib/models.js";
import { reserveSiteBudget } from "../functions/_lib/budget.js";
import { readFileSync } from "node:fs";
import { corsHeadersFor } from "../functions/_lib/http.js";
import { onRequestPost } from "../functions/api/ai-recommendation.js";
import { buildCoachingContext, validateCoachingContext } from '../functions/_lib/coaching.js';
import { createCoachingSelection } from './helpers/coaching-fixture.mjs';

const GOOD = {
  age: 35,
  gender: "male",
  height: 170,
  weight: 70,
  health_status: "has_conditions",
  diseases: ["hypertension"],
  fitness_level: "good",
  exercise_habit: "moderate",
  exercise_goal: "health",
  limitations: [],
  parq_answers: { ...Object.fromEntries(Array.from({length:7},(_,i)=>["parq_q"+(i+1),"no"])), parq_q2: "yes" },
  prescription: { frequency: 3, time: 20, intensity: "light", type: ["有氧運動", "肌力訓練"], volume: 150 },
};

const validChoice = Object.fromEntries(Object.entries(buildAdviceContext(validateUserData(GOOD).data).catalog).map(([k,v])=>[k,Object.keys(v).slice(0,2)]));
const validNarrative = createCoachingSelection(buildCoachingContext(validateUserData(GOOD).data, validateCoachingContext().data));
const KV_OK = { get: async () => "0", put: async () => {} };
const KV_FULL = { get: async () => "10", put: async () => {} };
const KV_READ_FAIL = { get: async () => { throw new Error("unavailable"); }, put: async () => {} };
const KV_WRITE_FAIL = { get: async () => "0", put: async () => { throw new Error("quota"); } };

function post(body, env) {
  const request = new Request("https://example.com/api/ai-recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({schemaVersion:3,...body}),
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

test("validateUserData: strict input, complete PARQ, server recomputes all prescription fields", () => {
  for (const patch of [{age:"35 INJECT"},{diseases:["fake"]},{exercise_goal:"hack"},{parq_answers:{}},{health_status:"healthy"},{limitations:["none","pain"]}]) {
    assert.equal(validateUserData({...GOOD,...patch}).valid,false,JSON.stringify(patch));
  }
  const expected=validateUserData(GOOD).data.prescription;
  for(const prescription of [undefined,null,{time:180,frequency:7,intensity:"moderate-vigorous"},"<script>hacked</script>"]) {
    const v=validateUserData({...GOOD,bmi:1,prescription});
    assert.equal(v.valid,true);assert.deepEqual(v.data.prescription,expected);
  }
  assert.equal(expected.intensity,'light');assert.equal(expected.heartRateZone,null);
});
test("summary carries only normalized input and trusted baseline",()=>{
  const data=validateUserData({...GOOD,notes:'INJECT',prescription:{type:['INJECT']}}).data;
  const summary=buildUserSummary(data,buildAdviceContext(data));
  assert.doesNotMatch(summary,/INJECT|undefined/);
  assert.equal(JSON.parse(summary).risk,'high');
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
  let r = await asJson(await post({ userData: GOOD, provider: "groq", model: "not-allowed-model" }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: kv }));
  assert.equal(r.status, 400);
  assert.match(r.body.error, /允許清單/);
  assert.equal(rateLimitCalls, 0);

  r = await asJson(await post({ userData: { ...GOOD, age: "abc" } }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 400);

  r = await asJson(await post({ userData: GOOD, model: 123 }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 400);

  r = await asJson(await post({ userData: GOOD, provider: "auto" }, { RATE_LIMIT_KV: KV_OK }));
  assert.equal(r.status, 503);
});

test("handler: 限流 429；KV 不可用時站方金鑰 fail-closed、自帶金鑰放行", async () => {
  let r = await asJson(await post({ userData: GOOD }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_FULL }));
  assert.equal(r.status, 429);

  r = await asJson(await post({ userData: GOOD, provider: "groq" }, { GROQ_API_KEY: "k" }));
  assert.equal(r.status, 503);
  assert.equal(r.body.retryScope, "site");

  r = await asJson(await post({ userData: GOOD, provider: "groq" }, { GROQ_API_KEY: "k", RATE_LIMIT_KV: KV_WRITE_FAIL }));
  assert.equal(r.status, 503);
});

test("handler: auto 附帶任意金鑰不能繞過 KV 缺失、讀取或寫入失敗", async (t) => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls++;
    return Response.json({ choices: [{ message: { content: JSON.stringify(validNarrative) }, finish_reason: "stop" }] });
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

test("handler: structured result, rejects truncation, hides upstream bodies and respects retry-after", async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 const selection=validNarrative;
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify(selection)},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:50}});
 let r=await asJson(await post({userData:GOOD},{GROQ_API_KEY:'k',RATE_LIMIT_KV:KV_OK}));
 assert.equal(r.status,200);assert.equal(r.body.mode,'consultation');assert.equal(r.body.schemaVersion,3);
 assert.equal(r.body.report.sections.length,6);assert.equal(r.body.baseline.intensity,'light');
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify(selection)},finish_reason:'length'}]});
 r=await asJson(await post({userData:GOOD,provider:'groq',customApiKey:'k'},{}));
 assert.equal(r.status,502);assert.match(r.body.error,/完整性/);assert.equal(r.body.advice,undefined);
 globalThis.fetch=async()=>new Response('private medical content',{status:401});
 r=await asJson(await post({userData:GOOD,provider:'groq',customApiKey:'k'},{}));
 assert.equal(r.status,400);assert.match(r.body.error,/金鑰無效/);assert.doesNotMatch(JSON.stringify(r),/private/);
 globalThis.fetch=async()=>new Response('secret',{status:429,headers:{'Retry-After':'27'}});
 const res=await post({userData:GOOD,provider:'groq',customApiKey:'k'},{});
 assert.equal(res.status,429);assert.equal(res.headers.get('Retry-After'),'27');
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
    return Response.json({ choices: [{ message: { content: JSON.stringify(validNarrative) }, finish_reason: "stop" }] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const encoder = new TextEncoder();
  const jsonText = JSON.stringify({ schemaVersion:3, userData: GOOD, provider: "groq", customApiKey: "own-key-fixture" });
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

test('30 baseline cases: extraction preserves every clinical field',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json',import.meta.url)));
 assert.equal(fixture.cases.length,30);
 for(const {id,data,expected} of fixture.cases) assert.deepEqual(globalThis.ExerciseRules.calculateFITTVP(data),expected,id);
});
test('all PARQ combinations use identical client/server caps; mismatched prescription ignored',()=>{
 for(let mask=0;mask<128;mask++) {
  const input={...GOOD,parq_answers:Object.fromEntries(Array.from({length:7},(_,i)=>['parq_q'+(i+1),mask&(1<<i)?'yes':'no']))};
  const v=validateUserData(input);assert.equal(v.valid,true);
  assert.deepEqual(v.data.prescription,globalThis.ExerciseRules.calculateFITTVP(v.data));
  const ctx=buildAdviceContext(v.data);
  if(ctx.risk.level==='high') assert.ok(ctx.consult);
 }
});
test('model selection cannot insert text, external sources, duplicate or ineligible actions',()=>{
 const ctx=buildAdviceContext(validateUserData(GOOD).data);
 for(const value of [null,{},[],{...validChoice,startToday:['calendar','choose']},{...validChoice,sourceIds:['fake']},{...validChoice,checkIn:['record','record']},{...validChoice,checkIn:['record','<img src=x onerror=alert(1)>']}]) {
  assert.throws(()=>validateSelection(JSON.stringify(value),ctx),/Invalid/);
 }
 const selected=validateSelection(JSON.stringify(validChoice),ctx);
 const r=presentAdvice(selected,ctx);assert.equal(r.mode,'consultation');assert.equal(r.sources[0].url,'https://eparmedx.com/');
});
test('provider adapters send current schema parameters and parse only complete public output',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 const ctx=buildAdviceContext(validateUserData(GOOD).data),content=JSON.stringify(validChoice);
 for(const provider of ['groq','openai','claude','gemini']) {
  let sent;
  globalThis.fetch=async(url,init)=>{
   sent={url,body:JSON.parse(init.body),headers:init.headers};
   const results={groq:{choices:[{message:{content},finish_reason:'stop'}]},openai:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:content}]}]},claude:{stop_reason:'end_turn',content:[{type:'text',text:content}]},gemini:{candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'PRIVATE_REASONING'},{text:content}]}}]}};
   return Response.json(results[provider]);
  };
  const r=await callProvider(provider,'summary','fixture-key',DEFAULT_MODELS[provider],ctx);
  assert.equal(r.content,content);assert.doesNotMatch(sent.url,/fixture-key/);
  if(provider==='groq') assert.equal(sent.body.response_format.json_schema.strict,true);
  if(provider==='openai'){assert.match(sent.url,/responses$/);assert.equal(sent.body.store,false);assert.equal(sent.body.temperature,undefined);assert.deepEqual(sent.body.text.format.schema,adviceSchema(ctx));}
  if(provider==='claude') assert.equal(sent.body.output_config.format.type,'json_schema');
  if(provider==='gemini'){assert.equal(sent.body.generationConfig.thinkingConfig.thinkingLevel,'low');assert.deepEqual(sent.body.generationConfig.responseJsonSchema,adviceSchema(ctx));}
 }
});
test('refusal and incomplete output never pass adapters',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 const ctx=buildAdviceContext(validateUserData(GOOD).data);
 for(const [provider,result] of [['groq',{choices:[{finish_reason:'stop',message:{content:'{}',refusal:'no'}}]}],['openai',{status:'incomplete',output:[]}],['claude',{stop_reason:'max_tokens',content:[{type:'text',text:'{}'}]}],['gemini',{candidates:[{finishReason:'SAFETY'}]}]]) {
  globalThis.fetch=async()=>Response.json(result);
  await assert.rejects(callProvider(provider,'summary','k',DEFAULT_MODELS[provider],ctx),{code:'INCOMPLETE_OUTPUT'});
 }
});
test('daily site budget reserves before call, caps exhausted days, fails closed on corrupt/unavailable KV',async()=>{
 let balance='0';const kv={get:async()=>balance,put:async(k,v)=>{balance=v;}};
 assert.equal((await reserveSiteBudget({RATE_LIMIT_KV:kv,AI_DAILY_BUDGET_USD:'0.006'},MODELS.groq.models[0])).allowed,true);
 assert.equal((await reserveSiteBudget({RATE_LIMIT_KV:kv,AI_DAILY_BUDGET_USD:'0.006'},MODELS.groq.models[0])).allowed,false);
 for(const env of [{},{RATE_LIMIT_KV:KV_READ_FAIL},{RATE_LIMIT_KV:KV_WRITE_FAIL},{RATE_LIMIT_KV:kv,AI_DAILY_BUDGET_USD:'bad'},{RATE_LIMIT_KV:kv,AI_DAILY_BUDGET_USD:'0'}]) assert.equal((await reserveSiteBudget(env,MODELS.groq.models[0])).allowed,false);
});
test('catalog exposes no secrets, candidates cannot consume site keys, old client receives refresh notice',async()=>{
 const cat=publicCatalog({GROQ_API_KEY:'secret-fixture',OPENAI_API_KEY:'secret-fixture'});
 assert.equal(cat.defaultProvider,'groq');assert.deepEqual(cat.providers.map(p=>p.id),['groq']);assert.deepEqual(cat.available,{groq:true});
 const noSiteKey=publicCatalog({OPENAI_API_KEY:'secret-fixture'});assert.equal(noSiteKey.defaultProvider,null);assert.deepEqual(noSiteKey.available,{groq:false});assert.ok(noSiteKey.providers[0].models.every(m=>m.requiresKey));assert.doesNotMatch(JSON.stringify(cat),/secret-fixture|envKey/);
 let r=await post({userData:GOOD,provider:'openai'},{OPENAI_API_KEY:'key',RATE_LIMIT_KV:KV_OK});assert.equal(r.status,400);
 r=await post({schemaVersion:1,userData:GOOD},{});assert.equal(r.status,409);
 assert.equal(parseRetryAfter('15'),15);assert.equal(parseRetryAfter('bad'),null);
 assert.equal(parseRetryAfter('Sun, 27 Sep 2026 00:00:30 GMT',Date.parse('2026-09-27T00:00:00Z')),30);
});
