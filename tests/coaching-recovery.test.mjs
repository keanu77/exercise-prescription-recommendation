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
const badAnswer = 'PRIVATE_BAD_ITEM 改走三十分鐘';
const recover = value => {
  assert.equal(typeof coaching.validateCoachingReport, 'function');
  return coaching.validateCoachingReport(typeof value === 'string' ? value : JSON.stringify(value), ctx);
};
const upstream = value => Response.json({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 200 } });
const post = () => onRequestPost({ env: {}, request: new Request('https://example.com/api/ai-recommendation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 3, userData: data, provider: 'groq', customApiKey: 'PRIVATE_FIXTURE_KEY' }) }) });

test('one unsafe answer is omitted locally without spending a model retry or exposing its text', async t => {
  const originalFetch = globalThis.fetch, originalWarn = console.warn, originalInfo = console.info;
  const logs = []; let calls = 0;
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; console.info = originalInfo; });
  const value = good(); value.answer.push(badAnswer);
  console.warn = message => logs.push(message); console.info = message => logs.push(message);
  globalThis.fetch = async () => { calls++; return upstream(value); };
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(calls, 1);
  assert.equal(result.meta.attempts, 1);
  assert.equal(result.meta.omittedItems, 1);
  assert.deepEqual(result.report.sections.find(section => section.id === 'answer').items, [value.answer[0]]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_BAD_ITEM|三十分鐘/);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_BAD_ITEM|三十分鐘|PRIVATE_FIXTURE_KEY/);
  assert.doesNotMatch(logs.join(''), /"itemIndex"/);
});

test('strict validator retains an internal answer index and never prunes aligned reasons', () => {
  const value = good(); value.answer.push(badAnswer);
  assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(value), ctx), { code: 'INVALID_OUTPUT', reason: 'obvious_dose', field: 'answer', itemIndex: 1 });
  const result = recover(value);
  assert.equal(result.omittedItems, 1);
  assert.deepEqual(result.selection, { ...value, answer: [value.answer[0]] });
  for (const field of ['actionReasons', 'barrierReasons']) {
    const invalidReason = good(); invalidReason[field][1] = 'PRIVATE_REASON 9';
    assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(invalidReason), ctx), { reason: 'forbidden_numeric', field, itemIndex: 1 });
    if (field === 'actionReasons') assert.throws(() => recover(invalidReason), { reason: 'forbidden_numeric', field, itemIndex: 1 });
    else {
      const recovered = recover(invalidReason);
      assert.equal(recovered.omittedItems, 1);
      assert.deepEqual(recovered.selection.barrierReasons, [invalidReason.barrierReasons[0], ctx.decisionFrame.barriers[1].reasonFallback]);
    }
  }
});

test('one unsafe barrier explanation uses the trusted same-index reason without a provider retry', async t => {
  const originalFetch = globalThis.fetch, originalWarn = console.warn, originalInfo = console.info;
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; console.info = originalInfo; });
  const value = good(), logs = []; let calls = 0;
  value.barrierReasons[1] = 'PRIVATE_BARRIER 依原安全提醒處理身體變化可確保在等待諮詢期間仍維持安全';
  assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(value), ctx), { reason: 'unsafe_advice', field: 'barrierReasons', itemIndex: 1 });
  console.warn = line => logs.push(line); console.info = line => logs.push(line);
  globalThis.fetch = async () => { calls++; return upstream(value); };
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(calls, 1);
  assert.equal(result.meta.attempts, 1);
  assert.equal(result.meta.omittedItems, 1);
  const recovered = recover(value);
  assert.deepEqual(recovered.selection, { ...value, barrierReasons: [value.barrierReasons[0], ctx.decisionFrame.barriers[1].reasonFallback] });
  assert.equal(result.report.sections[3].items[1][1], `${ctx.decisionFrame.barriers[1].alternative}；${ctx.decisionFrame.barriers[1].reasonFallback}`);
  assert.doesNotMatch(JSON.stringify([result, recovered, logs]), /PRIVATE_BARRIER|PRIVATE_FIXTURE_KEY|確保在等待/);
});

test('both barrier reasons may be replaced once while answer omission remains independent', () => {
  const value = { ...good(), barrierReasons: ['<PRIVATE_FIRST>', 'PRIVATE_SECOND 99'] };
  value.answer.push(badAnswer);
  const result = recover(value);
  assert.equal(result.omittedItems, 3);
  assert.deepEqual(result.selection.answer, [value.answer[0]]);
  assert.deepEqual(result.selection.barrierReasons, ctx.decisionFrame.barriers.map(item => item.reasonFallback));
  assert.deepEqual(result.selection.actionReasons, value.actionReasons);
  assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify(result.selection), ctx));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
});

test('invalid trusted barrier reasons fail closed without repeated replacement', () => {
  for (const fallback of [undefined, 'PRIVATE_FALLBACK 確保安全', '字'.repeat(601)]) {
    const context = structuredClone(ctx); let reads = 0;
    Object.defineProperty(context.decisionFrame.barriers[1], 'reasonFallback', { get() { reads++; return fallback; } });
    const value = good(); value.barrierReasons[1] = 'PRIVATE_BAD 99';
    assert.throws(() => coaching.validateCoachingReport(JSON.stringify(value), context), { code: 'INVALID_OUTPUT' });
    assert.equal(reads, 1);
  }
});

test('raised clinical flags use consultation fallback reasons and count each omitted AI item once', () => {
  const value = { ...good(), needsClinicalReview: true, clinicalReason: '先釐清胸悶出現的情境與活動許可', barrierReasons: ['PRIVATE 99', '確保等待期間安全'] };
  const result = recover(value);
  const consultation = coaching.buildDecisionFrame(ctx, true);
  assert.equal(result.omittedItems, 5);
  assert.deepEqual(result.selection.barrierReasons, consultation.barriers.map(item => item.reasonFallback));
  assert.equal(result.selection.needsClinicalReview, true);
  assert.equal(result.selection.clinicalReason, value.clinicalReason);
  value.answer.push(badAnswer);
  assert.equal(recover(value).omittedItems, 6);
});

test('consultation safety assurances use trusted barrier explanations while valid answers and clinician questions remain', () => {
  const context = coaching.buildCoachingContext(validateUserData(data).data, coaching.validateCoachingContext({ question: '活動後胸悶怎麼辦？' }).data);
  const goodValue = createCoachingSelection(context);
  for (const text of ['依安全提醒處理身體變化可在等待諮詢期間保持安全', '依照提醒就能維持安全', '在等待諮詢期間仍維持安全']) {
    const value = { ...goodValue, barrierReasons: [goodValue.barrierReasons[0], text] };
    assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(value), context), { reason: 'unsafe_advice', field: 'barrierReasons', itemIndex: 1 });
    const result = coaching.validateCoachingReport(JSON.stringify(value), context);
    assert.deepEqual(result.selection, { ...value, barrierReasons: [value.barrierReasons[0], context.decisionFrame.barriers[1].reasonFallback] });
    assert.equal(result.omittedItems, 1);
  }
  for (const text of ['不能在等待諮詢期間保持安全', '不代表可以在等待諮詢期間保持安全', '無法保證在等待諮詢期間維持安全', '不能維持安全', '詢問醫師是否能在等待諮詢期間維持安全', '等待諮詢期間依安全提醒記錄身體變化']) {
    assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify({ ...goodValue, answer: [text] }), context), text);
  }
});

test('empty required sections and non-array structural or scalar failures cannot be pruned', () => {
  const cases = [
    { ...good(), answer: [badAnswer, badAnswer] },
    { ...good(), actionReasons: ['PRIVATE_REASON 88', good().actionReasons[1]] },
    { ...good(), nextQuestion: 'PRIVATE_QUESTION 88' },
    { ...good(), needsClinicalReview: true, clinicalReason: 'PRIVATE_REASON 88' },
    { ...good(), needsClinicalReview: false, clinicalReason: '旗標與理由不一致' },
    { ...good(), PRIVATE_UNKNOWN_KEY: 'unexpected' },
    { ...good(), answer: [] },
    { ...good(), answer: [badAnswer] },
    { ...good(), barrierReasons: ['PRIVATE_BAD 99'] },
    { ...good(), barrierReasons: ['PRIVATE_BAD 99', '不合格理由', '多餘理由'] },
    '{PRIVATE_BAD_JSON',
  ];
  for (const value of cases) assert.throws(() => recover(value), { code: 'INVALID_OUTPUT' });
  for (const patch of [{ actionReasons: ['PRIVATE_ACTION 99', '必須保留對齊'] }, { nextQuestion: 'PRIVATE_QUESTION 99' }, { needsClinicalReview: true, clinicalReason: 'PRIVATE_CLINICAL 99' }]) {
    assert.throws(() => recover({ ...good(), ...patch, barrierReasons: ['PRIVATE_BARRIER 99', good().barrierReasons[1]] }), { code: 'INVALID_OUTPUT' });
  }
});

test('all-bad items, bad aligned reasons and unknown schema keys continue into the existing model retry', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  for (const value of [{ ...good(), answer: [badAnswer, badAnswer] }, { ...good(), actionReasons: ['PRIVATE_REASON 88', good().actionReasons[1]] }, { ...good(), PRIVATE_UNKNOWN_KEY: 'unexpected' }]) {
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
  value.answer.push('你可以先開始跑步');
  globalThis.fetch = async () => upstream(value);
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.mode, 'consultation');
  assert.equal(result.meta.omittedItems, 6);
  assert.doesNotMatch(JSON.stringify(result.report.sections.find(section => section.id === 'plan')), /\d+ 分鐘|每週 \d/);
  assert.ok(result.report.sections.find(section => section.id === 'safety').items.includes(value.clinicalReason));
});

test('recovery revalidates the remaining answer and keeps both reason arrays aligned', () => {
  const value = good(); value.answer.push('PRIVATE 88');
  const result = recover(value);
  assert.equal(result.omittedItems, 1);
  assert.equal(result.selection.answer.length, 1);
  for (const field of ['actionReasons', 'barrierReasons']) assert.deepEqual(result.selection[field], value[field]);
  assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify(result.selection), ctx));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
  assert.throws(() => recover({ ...value, answer: ['PRIVATE 88', 'PRIVATE 99'] }), { reason: 'forbidden_numeric' });
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
    const barrierValue = good(); barrierValue.barrierReasons[1] = text;
    assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify(barrierValue), context), { reason, field: 'barrierReasons', itemIndex: 1 });
    const replaced = coaching.validateCoachingReport(JSON.stringify(barrierValue), context);
    assert.equal(replaced.omittedItems, 1);
    assert.deepEqual(replaced.selection.barrierReasons, [barrierValue.barrierReasons[0], context.decisionFrame.barriers[1].reasonFallback]);
    assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify(replaced.selection), context));
  }
});
