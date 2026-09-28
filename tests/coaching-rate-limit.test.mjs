import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/ai-recommendation.js';

const data = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases[0].data;
const post = (env = {}, customApiKey = 'PRIVATE_KEY') => onRequestPost({ env, request: new Request('https://example.com/api/ai-recommendation', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaVersion: 3, userData: data, coachingContext: { question: 'PRIVATE_PROFILE 如何安排生活？' }, provider: 'groq', customApiKey }),
}) });

function captureLogs(t) {
  const originalFetch = globalThis.fetch, originalWarn = console.warn, originalInfo = console.info;
  const logs = [];
  console.warn = value => logs.push(JSON.parse(value));
  console.info = value => logs.push(JSON.parse(value));
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; console.info = originalInfo; });
  return logs;
}

test('Groq 429 scope is a closed enum for abbreviations and full quota names without exposing upstream content', async t => {
  const logs = captureLogs(t);
  const cases = [
    ['TPM', 'tpm'], ['TPD', 'tpd'], ['RPM', 'rpm'], ['RPD', 'rpd'],
    ['tokens per minute (TPM)', 'tpm'], ['Tokens Per Day', 'tpd'],
    ['requests per minute', 'rpm'], ['requests per day (rpd)', 'rpd'],
  ];
  for (const [label, expected] of cases) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ error: { message: `PRIVATE_UPSTREAM Rate limit reached on ${label}: PRIVATE_KEY PRIVATE_PROFILE`, code: 'rate_limit_exceeded', failed_generation: 'PRIVATE_DRAFT' } }, { status: 429, headers: { 'Retry-After': '27' } });
    };
    const response = await post();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '27');
    assert.equal(calls, 1);
    const body = await response.json();
    assert.equal(body.error, 'AI 服務目前流量過大，請稍後再試');
    assert.equal(logs.at(-1).rateLimitScope, expected);
    assert.equal(logs.at(-1).status, 429);
    assert.doesNotMatch(JSON.stringify([body, logs]), /PRIVATE_/);
  }
});

test('unknown, ambiguous, malformed and non-string 429 scopes remain unknown with no invented Retry-After', async t => {
  const logs = captureLogs(t);
  const bodies = [
    JSON.stringify({ error: { message: 'PRIVATE_UPSTREAM rate limit reached' } }),
    JSON.stringify({ error: { message: 'tokens per minute or tokens per day limit reached' } }),
    JSON.stringify({ error: { message: 'TPM and RPD exhausted' } }),
    JSON.stringify({ error: { message: { toString: 'TPM' }, code: 'PRIVATE_CODE' } }),
    JSON.stringify({ error: { message: 'NOTPM and TPM_PRIVATE are not scope labels', failed_generation: 'TPM' } }),
    'PRIVATE_INVALID_JSON', 'null', '',
  ];
  for (const body of bodies) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(body, { status: 429 }); };
    const response = await post();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), null);
    assert.equal(calls, 1);
    assert.equal(logs.at(-1).rateLimitScope, null);
    assert.doesNotMatch(JSON.stringify([await response.json(), logs]), /PRIVATE_/);
  }
});

test('429 distinguishes a request that is too large from exhausted quota using only known leading phrases', async t => {
  const logs = captureLogs(t);
  for (const [message, expected] of [
    ['Request too large for model PRIVATE_MODEL on tokens per minute (TPM): Requested PRIVATE_TOKENS', 'request_too_large'],
    ['  request too large for model PRIVATE_MODEL on TPM', 'request_too_large'],
    ['Rate limit reached for model PRIVATE_MODEL on tokens per minute (TPM)', 'exhausted'],
    ['rate limit reached for model PRIVATE_MODEL on TPM', 'exhausted'],
    ['PRIVATE_PREFIX Request too large for model on TPM', null],
    ['Try again later, Request too large or Rate limit reached on TPM', null],
    [null, null],
  ]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ error: { message } }, { status: 429 }); };
    const response = await post();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), null);
    assert.equal(calls, 1);
    assert.equal(logs.at(-1).rateLimitKind, expected);
    assert.equal(logs.at(-1).rateLimitScope, message === null ? null : 'tpm');
    assert.doesNotMatch(JSON.stringify([await response.json(), logs]), /PRIVATE_/);
  }
});

test('429 diagnostics bound declared and streaming bodies while retaining the original status and Retry-After', async t => {
  const logs = captureLogs(t);
  for (const declared of [false, true]) {
    let pulls = 0, cancelled = false, calls = 0;
    const body = new ReadableStream({
      pull(controller) { pulls++; controller.enqueue(new TextEncoder().encode('PRIVATE_UPSTREAM'.repeat(5000))); },
      cancel() { cancelled = true; },
    });
    globalThis.fetch = async () => {
      calls++;
      return new Response(body, { status: 429, headers: { 'Retry-After': '27', ...(declared ? { 'Content-Length': String(128 * 1024 + 1) } : {}) } });
    };
    const response = await post();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Retry-After'), '27');
    assert.equal(calls, 1);
    assert.equal(cancelled, true);
    assert.ok(pulls <= 3, `bounded reader requested ${pulls} chunks`);
    assert.equal(logs.at(-1).rateLimitScope, null);
    assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_/);
  }
});

test('429 leaves the upfront two-attempt site reservation intact and makes no extra call', async t => {
  const logs = captureLogs(t);
  let budgetWrites = 0, reserved = 0, calls = 0;
  const kv = { get: async () => '0', put: async (key, value) => { if (key.startsWith('ai-budget:')) { budgetWrites++; reserved = Number(value); } } };
  globalThis.fetch = async () => {
    assert.equal(budgetWrites, 1);
    assert.ok(reserved > 0);
    calls++;
    return Response.json({ error: { message: 'Rate limit reached on tokens per day (TPD)' } }, { status: 429 });
  };
  assert.equal((await post({ GROQ_API_KEY: 'PRIVATE_KEY', RATE_LIMIT_KV: kv }, null)).status, 429);
  assert.equal(calls, 1);
  assert.equal(budgetWrites, 1);
  assert.equal(logs.at(-1).rateLimitScope, 'tpd');
});

test('handler only logs whitelisted rate scopes and kinds associated with upstream 429', async t => {
  const logs = captureLogs(t);
  for (const [upstreamStatus, rateLimitScope, rateLimitKind] of [[429, 'PRIVATE_SCOPE', 'PRIVATE_KIND'], [400, 'tpm', 'exhausted'], [429, { tpm: true }, { exhausted: true }]]) {
    globalThis.fetch = async () => { throw Object.assign(new Error('PRIVATE_UPSTREAM'), { code: 'UPSTREAM_ERROR', upstreamStatus, rateLimitScope, rateLimitKind }); };
    const response = await post();
    assert.equal(logs.at(-1).rateLimitScope, null);
    assert.equal(logs.at(-1).rateLimitKind, null);
    assert.doesNotMatch(JSON.stringify([await response.json(), logs]), /PRIVATE_/);
  }
});
