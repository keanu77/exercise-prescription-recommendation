import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/ai-recommendation.js';
import { validateCoachingNarrative } from '../functions/_lib/coaching.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases;
const adult = { ...fixtures[0].data, age: 35, health_status: 'healthy', diseases: [], limitations: ['time'], parq_answers: Object.fromEntries(Array.from({ length: 7 }, (_, i) => ['parq_q' + (i + 1), 'no'])) };
const context = { question: '下班後很累，只想在家開始，如何減少準備？', availableDays: ['mon', 'wed'], sessionMinutes: 15, timeOfDay: 'evening', setting: 'home', equipment: ['none'], preferences: ['walking'] };
const narrative = () => ({ summary: '把下班後的準備減到最少，先找出能固定開始的生活提示', answer: ['你問的是下班後如何減少準備，可以把用品放在回家會經過的位置，先確認家中動線是否適合原處方'], priorities: [{ action: '把活動用品放在門邊', reason: '你在家安排且可用時間短，先減少找用品與切換活動的阻力' }], practicalSteps: [{ action: '檢查家中動線並把用品放妥', whenWhere: '若下班回家後容易忘記，可把準備接在換衣服之後' }], barriers: [{ obstacle: '臨時加班錯過原訂時段', alternative: '保留用品準備，重新挑選可行時段，不加倍補做' }], review: ['記下最容易被打斷的環節，調整用品擺放或開始提示'], nextQuestion: '回家後最常是哪件事打斷你的安排？', needsClinicalReview: false, clinicalReason: '' });
const request = body => new Request('https://example.com/api/ai-recommendation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 3, userData: adult, provider: 'groq', customApiKey: 'synthetic-key', ...body }) });
const post = (body, env = {}) => onRequestPost({ request: request(body), env });
function mock(t, value = narrative()) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, redirect: init.redirect, body: JSON.parse(init.body) }); return Response.json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 300 } }); };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

test('schema3 accepts useful generated prose and composes six sections with capped availability fragments', async t => {
  const calls = mock(t);
  const response = await post({ coachingContext: context });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.schemaVersion, 3);
  assert.equal(result.report.version, 2);
  assert.deepEqual(result.report.sections.map(s => s.id), ['answer', 'priorities', 'plan', 'barriers', 'review', 'safety']);
  assert.ok(JSON.stringify(result.report).includes(narrative().answer[0]));
  assert.match(JSON.stringify(result.report.sections[2]), /星期一|週一/);
  assert.match(JSON.stringify(result.report.sections[2]), /15 分鐘/);
  assert.match(JSON.stringify(result.report.sections[2]), /不代表|不足|未達|差距/);
  assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[0].redirect, 'manual');
  const payload = calls[0].body.messages[1].content;
  assert.ok(payload.includes(context.question));
  const promptData = JSON.parse(payload);
  assert.equal(promptData.profile.ageGroup, 'adult');
  assert.equal(promptData.untrustedCoachingContext.timeWindow, 'short');
  assert.equal(promptData.untrustedCoachingContext.sessionMinutes, undefined);
  assert.equal(promptData.baseline.time, undefined);
  assert.equal(promptData.baseline.frequency, undefined);
  assert.deepEqual(promptData.baseline.type, result.baseline.type);
  assert.match(payload, /home|在家/);
  assert.match(calls[0].body.messages[0].content, /不可信|不受信任/);
  assert.equal(calls[0].body.response_format.json_schema.strict, true);
  const stringPattern = new RegExp(calls[0].body.response_format.json_schema.schema.properties.summary.pattern, 'u');
  assert.ok(stringPattern.test('把下班後的短時段用在熟悉的活動'));
  assert.ok(!stringPattern.test('每天15分鐘') && !stringPattern.test('每天１５分鐘'));
  assert.ok(stringPattern.test(''), 'The same string schema must allow an empty clinicalReason');
});

test('invalid coaching data is rejected before KV or provider calls and old version asks refresh', async t => {
  const calls = mock(t); let kvCalls = 0;
  const env = { GROQ_API_KEY: 'fixture', RATE_LIMIT_KV: { get: async () => { kvCalls++; return '0'; }, put: async () => { kvCalls++; } } };
  for (const bad of [null, [], { question: 'x'.repeat(401) }, { question: 42 }, { availableDays: ['funday'] }, { availableDays: ['mon', 'mon'] }, { sessionMinutes: 12 }, { sessionMinutes: '15' }, { timeOfDay: 'midnight' }, { setting: 'office' }, { equipment: ['none', 'bands'] }, { preferences: ['walking', 'running', 'cycling', 'dance'] }, { preferences: ['walking', 'walking'] }, { surprise: 'injected' }]) {
    assert.equal((await post({ coachingContext: bad, customApiKey: null }, env)).status, 400, JSON.stringify(bad));
  }
  assert.equal(kvCalls, 0); assert.equal(calls.length, 0);
  assert.equal((await post({ schemaVersion: 2 })).status, 409);
});

test('coaching time and setting reject non-string JSON values before KV or upstream', async t => {
  const calls = mock(t); let kvCalls = 0;
  const env = { GROQ_API_KEY: 'fixture', RATE_LIMIT_KV: { get: async () => { kvCalls++; return '0'; }, put: async () => { kvCalls++; } } };
  for (const key of ['timeOfDay', 'setting']) {
    for (const value of [0, null, [], ['flexible'], {}, { toString: 1 }]) {
      const response = await post({ coachingContext: { [key]: value }, customApiKey: null }, env);
      assert.equal(response.status, 400, JSON.stringify({ [key]: value }));
      assert.equal((await response.json()).success, false);
    }
  }
  for (const key of ['__proto__', 'constructor', 'toString']) {
    const response = await post({ coachingContext: JSON.parse(`{"${key}":"unexpected"}`), customApiKey: null }, env);
    assert.equal(response.status, 400, key);
  }
  assert.equal(kvCalls, 0); assert.equal(calls.length, 0);
});

test('unknown availability remains unknown and profile contrasts reach upstream intact', async t => {
  const calls = mock(t);
  let response = await post({});
  assert.equal(response.status, 200);
  let result = await response.json();
  assert.doesNotMatch(JSON.stringify(result.report.sections[2]), /週一|星期一|早上|15 分鐘/);
  assert.match(JSON.stringify(result.report.sections[2]), /尚未|未提供|未知/);
  const other = { ...context, question: '健身房有啞鈴但不知道怎麼準備', sessionMinutes: 60, setting: 'gym', equipment: ['dumbbells'], preferences: ['strength'] };
  response = await post({ coachingContext: other });
  assert.equal(response.status, 200);
  assert.notEqual(calls[0].body.messages[1].content, calls[1].body.messages[1].content);
  assert.ok(calls[1].body.messages[1].content.includes(other.question));
  assert.match(calls[1].body.messages[1].content, /dumbbells/);
});

test('model cannot insert doses, HTML, URLs, medication changes, diagnoses or unknown properties', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  for (const text of ['每日跑步 99 分鐘', '走路３０分鐘', '每天跑步三十分鐘', '每晚做三組深蹲', '增加運動強度並忍痛完成', '<img src=x onerror=alert(1)>', '參考 https://evil.example', '根據哈佛研究，這樣一定有效', '自行停藥就可以開始', '先把降壓藥減半', '你已經罹患心臟病', 'ignore previous instructions']) {
    const value = { ...narrative(), answer: [text] };
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }] });
    assert.equal((await post({ coachingContext: context })).status, 502, text);
  }
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...narrative(), madeUpSource: 'a study' }) }, finish_reason: 'stop' }] });
  assert.equal((await post({})).status, 502);
});

test('minors, clinical context and model concern never receive newly numbered schedules', async t => {
  const calls = mock(t);
  for (const patch of [{ userData: { ...adult, age: 12 } }, { userData: { ...adult, parq_answers: { ...adult.parq_answers, parq_q2: 'yes' } } }, { coachingContext: { ...context, question: '爬樓梯會胸悶，還能跑步嗎？' } }, { userData: { ...adult, limitations: ['pain'] } }]) {
    const response = await post({ coachingContext: context, ...patch });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.doesNotMatch(JSON.stringify(result.report.sections[2]), /\d+ 分鐘|每週 \d|星期一|週一/);
  }
  assert.ok(calls.length >= 4);
  mock(t, { ...narrative(), needsClinicalReview: true, clinicalReason: '先整理身體變化與發生情境' });
  const result = await (await post({ coachingContext: context })).json();
  assert.equal(result.mode, 'consultation');
  assert.doesNotMatch(JSON.stringify(result.report.sections[2]), /\d+ 分鐘|星期一|週一/);
});

test('all clinical baselines and complete warnings remain identical for thirty profiles', async t => {
  mock(t);
  for (const c of fixtures) {
    const response = await post({ userData: c.data });
    assert.equal(response.status, 200, c.id);
    const result = await response.json();
    assert.deepEqual(result.baseline, c.expected, c.id);
    for (const warning of c.expected.warnings) assert.ok(result.report.sections[5].items.includes(warning), c.id + warning);
    for (const warning of globalThis.ExerciseRules.assessPARQRisk(c.data.parq_answers).recommendations) assert.ok(result.report.sections[5].items.includes(warning), c.id + warning);
  }
});

test('site reservation uses exactly adapter output ceiling and unsupported providers never receive a key', async t => {
  const calls = mock(t); let reserved = 0;
  const kv = { get: async () => '0', put: async (key, amount) => { if (key.startsWith('ai-budget:')) reserved = Number(amount); } };
  assert.equal((await post({ customApiKey: null, coachingContext: context }, { GROQ_API_KEY: 'fixture', RATE_LIMIT_KV: kv })).status, 200);
  const sent = calls[0].body;
  const input = new TextEncoder().encode(sent.messages.map(m => m.content).join('') + JSON.stringify(sent.response_format.json_schema.schema)).byteLength + 1000;
  assert.equal(reserved, (input * 0.15 + sent.max_completion_tokens * 0.6) / 1e6);
  assert.ok(sent.max_completion_tokens >= 4096);
  assert.equal((await post({ provider: 'openai' })).status, 400);
  assert.equal(calls.length, 1);
});

test('ordinary planning language is not mistaken for a new exercise dose', async t => {
  const value = { ...narrative(), review: ['下一次回顧可以看第一次準備卡在哪裡，這一次先找週末一天整理用品'] };
  mock(t, value);
  const response = await post({ coachingContext: context });
  assert.equal(response.status, 200);
  assert.ok(JSON.stringify((await response.json()).report).includes(value.review[0]));
});

test('consultation narrative cannot tell someone with symptoms to start exercise', async t => {
  mock(t, { ...narrative(), answer: ['你可以開始跑步，觀察感覺再說'] });
  const response = await post({ coachingContext: { ...context, question: '運動後胸口悶悶的，能跑步嗎？' } });
  assert.equal(response.status, 502);
});

test('oversized upstream envelope is canceled before loading it into memory', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let chunks = 0, canceled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    pull(controller) { if (++chunks > 30) return controller.close(); controller.enqueue(new Uint8Array(64 * 1024).fill(32)); },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 }));
  const response = await post({});
  assert.equal(response.status, 502);
  assert.equal(canceled, true);
  assert.ok(chunks <= 3);
});

test('narrative row labels stay short enough for readable web and PDF layouts', async t => {
  const value = narrative();
  value.priorities[0].action = '準備'.repeat(51);
  mock(t, value);
  assert.equal((await post({})).status, 502);
});

test('protective negations remain useful narrative instead of false safety failures', async t => {
  mock(t, { ...narrative(), answer: ['不要自行停藥', '不要增加運動強度', '不能保證改善'] });
  const response = await post({ coachingContext: context });
  assert.equal(response.status, 200);
  const answer = (await response.json()).report.sections[0].items;
  assert.deepEqual(answer, ['不要自行停藥', '不要增加運動強度', '不能保證改善']);
});

test('consultation rejects qualitative exercise prescriptions and discussion-before-exercise loopholes', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  for (const text of ['每週安排兩回快走', '在家做徒手肌力訓練', '和醫師討論前可以先開始跑步']) {
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...narrative(), answer: [text] }) }, finish_reason: 'stop' }] });
    const response = await post({ coachingContext: { ...context, question: '胸口悶悶的，能跑步嗎？' } });
    assert.equal(response.status, 502, text);
  }
});

test('consultation keeps non-dose clinician questions and negated exercise instructions', async t => {
  const answer = ['詢問醫師是否可以快走', '整理要向醫師確認的活動問題，確認何時可以恢復原本熟悉的活動', '不要在家做徒手肌力訓練，先整理影響生活的身體變化'];
  mock(t, { ...narrative(), answer });
  const response = await post({ coachingContext: { ...context, question: '胸口悶悶的，能跑步嗎？' } });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).report.sections[0].items, answer);
});

test('ordinary occupations and preparation words do not fabricate a clinical concern', async t => {
  mock(t);
  for (const question of ['我在醫院輪班工作，下班如何安排？', '麻煩幫我減少準備用品的負擔', '我想先熟悉游泳技術，如何安排學習？']) {
    const response = await post({ coachingContext: { ...context, question } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).mode, 'actions', question);
  }
});

test('specific symptoms and medical questions retain conservative consultation routing', async t => {
  mock(t);
  for (const question of ['爬樓梯會胸悶，怎麼安排？', '目前服藥中，可以調整運動嗎？', '肩膀會痛，適合用啞鈴嗎？', '走路後膝蓋發麻', '手術後想恢復原本活動']) {
    const response = await post({ coachingContext: { ...context, question } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).mode, 'consultation', question);
  }
});

test('minors reject explicit adult weight-loss instructions while preserving protective negations', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  for (const [text, status] of [['透過節食減重', 502], ['限制熱量攝取', 502], ['不需節食減重', 200], ['不套用成人熱量目標', 200]]) {
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...narrative(), answer: [text] }) }, finish_reason: 'stop' }] });
    const response = await post({ userData: { ...adult, age: 12 }, coachingContext: context });
    assert.equal(response.status, status, text);
  }
});

// Workers rejects redirect:error even though Node implements it
// Manual mode must reject redirects without forwarding provider credentials
test('provider uses Workers-compatible manual redirects and rejects redirected responses', async t => {
  const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original;});
  let calls=0, canceled=false;
  globalThis.fetch=async (_url,init)=>{
    calls++; assert.equal(init.redirect,'manual');
    return new Response(new ReadableStream({cancel(){canceled=true;}}),{status:302,headers:{Location:'https://untrusted.invalid'}});
  };
  assert.equal((await post({coachingContext:context})).status,502);
  assert.equal(calls,1); assert.equal(canceled,true);
});

test('narrative failures expose fixed diagnostic categories and schema field names only', () => {
  const samples = [
    ['{PRIVATE_INVALID_JSON', undefined, 'json', undefined],
    [JSON.stringify({ ...narrative(), answer: [] }), undefined, 'schema', 'answer'],
    [JSON.stringify({ ...narrative(), answer: ['PRIVATE 37 分鐘'] }), undefined, 'forbidden_numeric', 'answer'],
    [JSON.stringify({ ...narrative(), answer: ['<PRIVATE_MARKUP>'] }), undefined, 'forbidden_markup', 'answer'],
    [JSON.stringify({ ...narrative(), answer: ['每週安排兩回快走'] }), undefined, 'obvious_dose', 'answer'],
    [JSON.stringify({ ...narrative(), answer: ['建議自行停藥'] }), undefined, 'unsafe_advice', 'answer'],
    [JSON.stringify({ ...narrative(), answer: ['根據哈佛研究，可以持續進步'] }), undefined, 'citation', 'answer'],
    [JSON.stringify({ ...narrative(), needsClinicalReview: true }), undefined, 'clinical_flag', 'clinicalReason'],
    [JSON.stringify({ ...narrative(), answer: ['在家做徒手肌力訓練'] }), { consult: true }, 'consultation_directive', 'answer'],
    [JSON.stringify({ ...narrative(), answer: ['透過節食減重'] }), { minor: true }, 'minor_weightloss', 'answer'],
  ];
  for (const [content, ctx, reason, field] of samples) {
    assert.throws(() => validateCoachingNarrative(content, ctx), error => {
      assert.equal(error.code, 'INVALID_OUTPUT');
      assert.equal(error.reason, reason);
      assert.equal(error.field, field);
      assert.doesNotMatch(error.message, /PRIVATE/);
      return true;
    }, reason);
  }
});

test('handler diagnostics never log model content, questions, keys or unknown error properties', async t => {
  const originalFetch = globalThis.fetch, originalWarn = console.warn;
  const logs = [];
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; });
  console.warn = value => logs.push(JSON.parse(value));
  const requestBody = { coachingContext: { ...context, question: 'PRIVATE_QUESTION' }, customApiKey: 'PRIVATE_KEY' };
  const scenarios = [
    [{ choices: [{ message: { content: JSON.stringify({ ...narrative(), answer: ['PRIVATE_RAW 37 分鐘'] }) }, finish_reason: 'stop' }] }, 'INVALID_OUTPUT', 'forbidden_numeric', 'answer'],
    [{ choices: [{ message: { content: 'PRIVATE_RAW' }, finish_reason: 'PRIVATE_FINISH_REASON' }] }, 'INCOMPLETE_OUTPUT', 'finish_reason', null],
    [{ choices: [{ message: { content: 'PRIVATE_RAW', refusal: 'PRIVATE_REFUSAL' }, finish_reason: 'stop' }] }, 'INCOMPLETE_OUTPUT', 'refusal', null],
    [{ choices: [{ message: { content: '' }, finish_reason: 'stop' }] }, 'INCOMPLETE_OUTPUT', 'empty', null],
    [{ choices: [{ message: { content: 'x'.repeat(14001) }, finish_reason: 'stop' }] }, 'INCOMPLETE_OUTPUT', 'oversize', null],
  ];
  for (const [upstream, code, reason, field] of scenarios) {
    globalThis.fetch = async () => Response.json(upstream);
    const response = await post(requestBody);
    assert.equal(response.status, 502);
    const publicError = await response.json();
    assert.match(publicError.error, /完整性檢查/);
    assert.equal(publicError.reason, undefined);
    assert.equal(logs.at(-1).code, code);
    assert.equal(logs.at(-1).reason, reason);
    assert.equal(logs.at(-1).field, field);
  }
  globalThis.fetch = async () => { throw Object.assign(new Error('PRIVATE_MESSAGE'), { reason: 'PRIVATE_REASON', field: 'PRIVATE_FIELD', doseKind: 'PRIVATE_DOSE_KIND' }); };
  assert.equal((await post(requestBody)).status, 502);
  assert.equal(logs.at(-1).reason, null);
  assert.equal(logs.at(-1).field, null);
  assert.equal(logs.at(-1).doseKind, null);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE/);
});

test('missed sessions, rescheduling and named preparation checks are not new exercise doses', () => {
  for (const text of ['錯過一次運動', '臨時取消一次運動，不需要加倍補課', '沒完成，也不需要一次補回', '把運動改到另一天', '回家先做一次用品檢查', '完成一次用品整理', '每天先整理跑步用品', '不要每天跑步']) {
    const value = { ...narrative(), barriers: [{ obstacle: '實際安排有變化', alternative: text }] };
    assert.doesNotThrow(() => validateCoachingNarrative(JSON.stringify(value)), text);
  }
});

test('planning and negative clauses cannot hide subsequent real exercise doses', () => {
  for (const text of ['先做三組深蹲', '每週安排兩回快走', '每天跑步三十分鐘', '快走兩天', '一週運動三天', '不要每天跑步三十分鐘', '錯過一次運動，明天做三組深蹲', '把運動改到另一天，改做兩回快走', '完成一次用品整理，然後快走兩天', '每天先整理跑步用品再跑步', '不要每天跑步，改成每晚跑步']) {
    const value = { ...narrative(), barriers: [{ obstacle: '安排調整', alternative: text }] };
    assert.throws(() => validateCoachingNarrative(JSON.stringify(value)), { code: 'INVALID_OUTPUT', reason: 'obvious_dose' }, text);
  }
});

test('dose diagnostics distinguish duration, habitual exercise and count without raw text', () => {
  for (const [text, doseKind] of [['跑步三十分鐘', 'duration'], ['每天跑步', 'habitual'], ['做三組深蹲', 'count']]) {
    const value = { ...narrative(), barriers: [{ obstacle: '安排調整', alternative: text }] };
    assert.throws(() => validateCoachingNarrative(JSON.stringify(value)), { reason: 'obvious_dose', field: 'barriers', doseKind });
  }
});
