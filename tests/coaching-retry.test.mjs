import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/ai-recommendation.js';
import { validateUserData } from '../functions/_lib/ai.js';
import { buildCoachingContext, validateCoachingContext } from '../functions/_lib/coaching.js';
import { createCoachingSelection } from './helpers/coaching-fixture.mjs';

const data = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases[0].data;
const ctx = buildCoachingContext(validateUserData(data).data, validateCoachingContext().data);
const good = createCoachingSelection(ctx);
const bad = { ...good, answer: ['PRIVATE_REJECTED_DRAFT 88 minutes'] };
const upstream = (value = good, input = 100, output = 200) => Response.json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }], usage: { prompt_tokens: input, completion_tokens: output } });
const post = (env = {}, ownKey = 'PRIVATE_KEY') => onRequestPost({ env, request: new Request('https://example.com/api/ai-recommendation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 3, userData: data, provider: 'groq', customApiKey: ownKey }) }) });

test('one bounded same-provider repair succeeds without resending or logging the rejected draft', async t => {
  const originalFetch = globalThis.fetch, originalWarn = console.warn, originalInfo = console.info;
  const calls = [], logs = [];
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; console.info = originalInfo; });
  console.warn = message => logs.push(message); console.info = message => logs.push(message);
  globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), headers: init.headers }); return calls.length === 1 ? upstream(bad) : upstream(good, 300, 400); };
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(calls.length, 2);
  assert.equal(result.meta.attempts, 2);
  assert.deepEqual(result.meta.usage, { inputTokens: 400, outputTokens: 600 });
  assert.equal(result.meta.estimatedCostUSD, (400 * 0.15 + 600 * 0.6) / 1e6);
  assert.equal(calls[0].url, calls[1].url);
  assert.equal(calls[0].body.model, calls[1].body.model);
  assert.equal(calls[0].headers.Authorization, calls[1].headers.Authorization);
  assert.equal(calls[0].body.messages[1].content, calls[1].body.messages[1].content);
  const repair = calls[1].body.messages[0].content.slice(calls[0].body.messages[0].content.length);
  assert.match(repair, /forbidden_numeric/);
  assert.ok(new TextEncoder().encode(repair).byteLength <= 1000);
  assert.doesNotMatch(JSON.stringify(calls[1].body), /PRIVATE_REJECTED_DRAFT/);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_REJECTED_DRAFT|PRIVATE_KEY/);
});

test('Groq json_validate_failed retries once and missing first-attempt usage remains unknown', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let count = 0;
  globalThis.fetch = async () => ++count === 1 ? Response.json({ error: { code: 'json_validate_failed', message: 'PRIVATE_UPSTREAM_MESSAGE', failed_generation: 'PRIVATE_REJECTED_DRAFT' } }, { status: 400 }) : upstream();
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(count, 2);
  assert.deepEqual(result.meta.usage, { inputTokens: null, outputTokens: null });
  assert.equal(result.meta.estimatedCostUSD, null);
});

test('invalid repair exhausts exactly two attempts and returns only the generic error', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let count = 0;
  globalThis.fetch = async () => { count++; return upstream(bad); };
  const response = await post();
  assert.equal(response.status, 502);
  assert.equal(count, 2);
  assert.match((await response.json()).error, /完整性檢查/);
});

test('transport, timeout, auth, rate-limit and unknown validation failures never retry', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  const cases = [
    [() => new Response('', { status: 401 }), 400],
    [() => new Response('', { status: 403 }), 400],
    [() => new Response('', { status: 429, headers: { 'Retry-After': '27' } }), 429],
    [() => Response.json({ error: { code: 'json_schema_invalid' } }, { status: 400 }), 502],
    [() => new Response('', { status: 500 }), 502],
    [() => { throw Object.assign(new Error('PRIVATE_TIMEOUT'), { name: 'TimeoutError' }); }, 504],
    [() => { throw new Error('PRIVATE_NETWORK'); }, 502],
    [() => Response.json({ choices: [{ message: { content: '{}' }, finish_reason: 'length' }] }), 502],
  ];
  for (const [produce, status] of cases) {
    let count = 0;
    globalThis.fetch = async () => { count++; return produce(); };
    const response = await post();
    assert.equal(response.status, status);
    assert.equal(count, 1);
    if (status === 429) assert.equal(response.headers.get('Retry-After'), '27');
  }
});

test('both attempts share one forty-five-second deadline', async t => {
  const originalFetch = globalThis.fetch, originalNow = Date.now, originalTimeout = AbortSignal.timeout;
  t.after(() => { globalThis.fetch = originalFetch; Date.now = originalNow; AbortSignal.timeout = originalTimeout; });
  let now = originalNow(), count = 0;
  const timeouts = [];
  Date.now = () => now;
  AbortSignal.timeout = milliseconds => { timeouts.push(milliseconds); return new AbortController().signal; };
  globalThis.fetch = async () => { count++; if (count === 1) { now += 12000; return upstream(bad); } return upstream(); };
  assert.equal((await post()).status, 200);
  assert.deepEqual(timeouts, [45000, 33000]);
  count = 0; timeouts.length = 0;
  globalThis.fetch = async () => { count++; now += 45000; return upstream(bad); };
  assert.equal((await post()).status, 504);
  assert.equal(count, 1);
  assert.deepEqual(timeouts, [45000]);
});

test('site key reserves both attempts and bounded repair input before any upstream call', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let reservation = 0, calls = 0, firstBody;
  const kv = { get: async () => '0', put: async (key, amount) => { if (key.startsWith('ai-budget:')) reservation = Number(amount); } };
  globalThis.fetch = async (_url, init) => {
    assert.ok(reservation > 0);
    const body = JSON.parse(init.body); firstBody ||= body;
    calls++; return calls === 1 ? upstream(bad) : upstream();
  };
  assert.equal((await post({ GROQ_API_KEY: 'fixture', RATE_LIMIT_KV: kv }, null)).status, 200);
  const initialInput = new TextEncoder().encode(firstBody.messages.map(message => message.content).join('') + JSON.stringify(firstBody.response_format.json_schema.schema)).byteLength + 1000;
  assert.equal(reservation, ((initialInput * 2 + 1000) * 0.15 + firstBody.max_completion_tokens * 2 * 0.6) / 1e6);
  assert.equal(calls, 2);
});

test('rate limiting during the repair returns Retry-After without further calls or refunds', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let count = 0, budgetWrites = 0;
  const kv = { get: async () => '0', put: async key => { if (key.startsWith('ai-budget:')) budgetWrites++; } };
  globalThis.fetch = async () => ++count === 1 ? upstream(bad) : new Response('', { status: 429, headers: { 'Retry-After': '27' } });
  const response = await post({ GROQ_API_KEY: 'fixture', RATE_LIMIT_KV: kv }, null);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '27');
  assert.equal(count, 2);
  assert.equal(budgetWrites, 1);
});
