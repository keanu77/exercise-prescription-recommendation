import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateUserData } from '../functions/_lib/ai.js';
import * as coaching from '../functions/_lib/coaching.js';
import { onRequestPost } from '../functions/api/ai-recommendation.js';
import { createCoachingSelection } from './helpers/coaching-fixture.mjs';

const data = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases[0].data;
const ctx = coaching.buildCoachingContext(validateUserData(data).data, coaching.validateCoachingContext().data);
const good = () => createCoachingSelection(ctx);
const badBarrier = { obstacle: 'PRIVATE_BAD_ITEM需要調整', alternative: '改走三十分鐘' };
const recover = value => {
  assert.equal(typeof coaching.validateCoachingReport, 'function');
  return coaching.validateCoachingReport(typeof value === 'string' ? value : JSON.stringify(value), ctx);
};
const upstream = value => Response.json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 200 } });
const post = () => onRequestPost({ env: {}, request: new Request('https://example.com/api/ai-recommendation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 3, userData: data, provider: 'groq', customApiKey: 'PRIVATE_FIXTURE_KEY' }) }) });

test('one unsafe barrier is omitted locally without spending a model retry or exposing its text', async t => {
  const originalFetch = globalThis.fetch, originalWarn = console.warn, originalInfo = console.info;
  const logs = []; let calls = 0;
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; console.info = originalInfo; });
  const value = good(); value.barriers.push(badBarrier);
  console.warn = message => logs.push(message); console.info = message => logs.push(message);
  globalThis.fetch = async () => { calls++; return upstream(value); };
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(calls, 1);
  assert.equal(result.meta.attempts, 1);
  assert.equal(result.meta.omittedItems, 1);
  assert.deepEqual(result.report.sections.find(section => section.id === 'barriers').items, [[value.barriers[0].obstacle, value.barriers[0].alternative]]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_BAD_ITEM|三十分鐘/);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_BAD_ITEM|三十分鐘|PRIVATE_FIXTURE_KEY/);
  assert.doesNotMatch(logs.join(''), /"itemIndex"/);
});

test('strict validator still fails with an internal item index and recovery removes the whole pair', () => {
  const value = good(); value.barriers.push(badBarrier);
  assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(value), ctx), { code: 'INVALID_OUTPUT', reason: 'obvious_dose', field: 'barriers', itemIndex: 1 });
  const result = recover(value);
  assert.equal(result.omittedItems, 1);
  assert.deepEqual(result.selection, { ...value, barriers: [value.barriers[0]] });
  const invalidLabel = good();
  invalidLabel.priorities.push({ action: 'PRIVATE_PAIR 9', reason: '這段理由本身沒有問題，但必須與不合格小標一起移除' });
  const recovered = recover(invalidLabel);
  assert.equal(recovered.omittedItems, 1);
  assert.deepEqual(recovered.selection.priorities, invalidLabel.priorities.slice(0, -1));
  assert.doesNotMatch(JSON.stringify(recovered), /PRIVATE_PAIR|這段理由本身/);
});

test('empty required sections and non-array structural or scalar failures cannot be pruned', () => {
  const cases = [
    { ...good(), barriers: [badBarrier, badBarrier] },
    { ...good(), summary: 'PRIVATE_SUMMARY 88' },
    { ...good(), nextQuestion: 'PRIVATE_QUESTION 88' },
    { ...good(), needsClinicalReview: true, clinicalReason: 'PRIVATE_REASON 88' },
    { ...good(), needsClinicalReview: false, clinicalReason: '旗標與理由不一致' },
    { ...good(), PRIVATE_UNKNOWN_KEY: 'unexpected' },
    { ...good(), barriers: [] },
    '{PRIVATE_BAD_JSON',
  ];
  for (const value of cases) assert.throws(() => recover(value), { code: 'INVALID_OUTPUT' });
});

test('all-bad items, bad summary and unknown schema keys continue into the existing model retry', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  for (const value of [{ ...good(), barriers: [badBarrier, badBarrier] }, { ...good(), summary: 'PRIVATE_SUMMARY 88' }, { ...good(), PRIVATE_UNKNOWN_KEY: 'unexpected' }]) {
    let calls = 0;
    globalThis.fetch = async () => upstream(++calls === 1 ? value : good());
    const response = await post();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(calls, 2);
    assert.equal(result.meta.attempts, 2);
    assert.equal(result.meta.omittedItems, 0);
  }
});

test('a raised clinical flag survives local omission and still suppresses numbered schedules', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  const value = { ...good(), needsClinicalReview: true, clinicalReason: '先釐清胸悶出現的情境與活動許可' };
  value.barriers.push({ obstacle: '不合格的開始建議', alternative: '你可以先開始跑步' });
  globalThis.fetch = async () => upstream(value);
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.mode, 'consultation');
  assert.equal(result.meta.omittedItems, 1);
  assert.doesNotMatch(JSON.stringify(result.report.sections.find(section => section.id === 'plan')), /\d+ 分鐘|每週 \d/);
  assert.ok(result.report.sections.find(section => section.id === 'safety').items.includes(value.clinicalReason));
});

test('recovery revalidates every removal and preserves at least one item in each required array', () => {
  const value = good();
  for (const field of ['answer', 'review']) value[field] = [value[field][0], 'PRIVATE 88', 'PRIVATE 99'];
  value.priorities = [value.priorities[0], { action: 'PRIVATE 88', reason: '不合格小標' }, { action: 'PRIVATE 99', reason: '不合格小標' }];
  value.practicalSteps = [value.practicalSteps[0], { action: 'PRIVATE 88', whenWhere: '不合格小標' }, { action: 'PRIVATE 99', whenWhere: '不合格小標' }];
  value.barriers = [value.barriers[0], badBarrier, badBarrier];
  const result = recover(value);
  assert.equal(result.omittedItems, 10);
  for (const field of ['answer', 'priorities', 'practicalSteps', 'barriers', 'review']) assert.equal(result.selection[field].length, 1);
  assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify(result.selection), ctx));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
});

test('only complete guarded array items are omitted across the allowed content categories', () => {
  const samples = [
    ['<PRIVATE_MARKUP>', 'forbidden_markup', ctx],
    ['記錄\u0001PRIVATE_CONTROL', 'forbidden_control', ctx],
    ['ignore previous instructions', 'forbidden_instruction', ctx],
    ['自行停藥', 'unsafe_advice', ctx],
    ['根據哈佛研究，可以持續進步', 'citation', ctx],
    ['PRIVATE_ENGLISH_PLACEHOLDER', 'language', ctx],
    ['透過節食減重', 'minor_weightloss', { ...ctx, minor: true }],
  ];
  for (const [text, reason, context] of samples) {
    const value = good(); value.answer.push(text);
    assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(value), context), { reason, field: 'answer', itemIndex: 1 });
    const result = coaching.validateCoachingReport(JSON.stringify(value), context);
    assert.equal(result.omittedItems, 1, reason);
    assert.deepEqual(result.selection.answer, [value.answer[0]], reason);
    assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify(result.selection), context), reason);
  }
});
