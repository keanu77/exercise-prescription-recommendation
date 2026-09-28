import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateUserData } from '../functions/_lib/ai.js';
import * as coaching from '../functions/_lib/coaching.js';

const adult = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases[0].data;
const context = (input = {}, profile = {}) => coaching.buildCoachingContext(validateUserData({ ...adult, ...profile }).data, coaching.validateCoachingContext(input).data);
const narrative = () => ({ answer: ['先確認家中是否有適合熟悉活動的空間，能減少開始前重新找場地的負擔'], actionReasons: ['選擇家中時仍需先確認空間，避免準備後才發現不適用', '把開始提示接在已有的生活事件之後，可以減少反覆決定的負擔'], barrierReasons: ['場地不確定時先釐清，能避免臨時新增不熟悉的活動', '準備花費會占用可用窗口，先記下才知道安排卡在哪裡'], nextQuestion: '家中有適合你熟悉活動的空間嗎？', needsClinicalReview: false, clinicalReason: '' });

test('decision frame owns every actionable section and models only answer, reasons and a question', () => {
  const ctx = context({ setting: 'home', sessionMinutes: 15, timeOfDay: 'evening', equipment: ['none'], preferences: ['walking'] });
  assert.ok(ctx.decisionFrame);
  assert.equal(ctx.decisionFrame.actions.length, 2);
  assert.equal(ctx.decisionFrame.barriers.length, 2);
  assert.ok(ctx.decisionFrame.unknown.includes('space'));
  assert.equal(ctx.decisionFrame.questionFocus.field, 'space');
  assert.match(ctx.decisionFrame.actions[0].instruction, /確認.*家中/);
  assert.doesNotMatch(JSON.stringify(ctx.decisionFrame), /客廳|走廊|院子|今晚|門邊|原地踏步/);
  const input = JSON.parse(coaching.buildCoachingPrompt(ctx));
  assert.deepEqual(input.decisionFrame, { known: ctx.decisionFrame.known, unknown: ctx.decisionFrame.unknown, actions: ctx.decisionFrame.actions.map(({ title, instruction }) => ({ title, instruction })), barriers: ctx.decisionFrame.barriers.map(({ title, alternative }) => ({ title, alternative })), questionFocus: ctx.decisionFrame.questionFocus });
  assert.doesNotMatch(JSON.stringify(input.decisionFrame), /reasonFallback|summary|reviewGuidance|\d/);
  assert.deepEqual(Object.keys(coaching.coachingSchema().properties), ['answer', 'actionReasons', 'barrierReasons', 'nextQuestion', 'needsClinicalReview', 'clinicalReason']);
  const value = narrative();
  const result = coaching.presentCoaching(coaching.validateCoachingNarrative(JSON.stringify(value), ctx), ctx);
  assert.equal(result.report.summary, ctx.decisionFrame.summary);
  assert.deepEqual(result.report.sections.map(s => s.id), ['answer', 'priorities', 'plan', 'barriers', 'review', 'safety']);
  assert.deepEqual(result.report.sections[1].items, ctx.decisionFrame.actions.map((action, i) => [action.title, value.actionReasons[i]]));
  assert.deepEqual(result.report.sections[2].items.slice(-2), ctx.decisionFrame.actions.map(action => [action.title, action.instruction]));
  ctx.decisionFrame.barriers.forEach((barrier, i) => {
    assert.ok(result.report.sections[3].items[i][1].includes(barrier.alternative));
    assert.ok(result.report.sections[3].items[i][1].includes(value.barrierReasons[i]));
  });
  assert.deepEqual(result.report.sections[4].items.slice(0, -1), ctx.decisionFrame.reviewGuidance);
});

test('frames differ by known setting and retain unknown access, skills and equipment familiarity', () => {
  const gym = context({ setting: 'gym', equipment: ['dumbbells'], preferences: ['strength'] }).decisionFrame;
  const pool = context({ setting: 'pool', preferences: ['swimming'] }).decisionFrame;
  const outside = context({ setting: 'outdoors', preferences: ['walking'] }).decisionFrame;
  const unknown = context().decisionFrame;
  assert.ok(gym && pool && outside && unknown);
  assert.match(JSON.stringify(gym.actions), /健身房|啞鈴/);
  assert.match(JSON.stringify(pool.actions), /泳池/);
  assert.match(JSON.stringify(outside.actions), /戶外/);
  for (const frame of [gym, pool, outside]) {
    assert.ok(frame.unknown.includes('familiarActivities'));
    assert.ok(frame.unknown.includes('access'));
    assert.match(JSON.stringify(frame.barriers), /若|如果/);
  }
  assert.equal(unknown.known.setting, null);
  assert.ok(unknown.unknown.includes('availableTime'));
  assert.match(JSON.stringify(unknown.actions), /熟悉|可用時段/);
  assert.doesNotMatch(JSON.stringify(unknown), /星期一|每天|下班|啞鈴|客廳/);
  assert.notDeepEqual(gym.actions, pool.actions);
});

test('missing-time questions ask only the part not already provided', () => {
  const daysKnown = context({ availableDays: ['mon'], sessionMinutes: null }).decisionFrame.questionFocus.prompt;
  const minutesKnown = context({ availableDays: [], sessionMinutes: 30 }).decisionFrame.questionFocus.prompt;
  assert.match(daysKnown, /多久/);
  assert.doesNotMatch(daysKnown, /哪些日子/);
  assert.match(minutesKnown, /哪些日子/);
  assert.doesNotMatch(minutesKnown, /多久/);
});

test('minor and consultation frames retain their separate purpose without invented schedules', () => {
  const minor = context({ preferences: ['play'] }, { age: 12 });
  const consult = context({ question: '運動後胸悶怎麼辦？', setting: 'gym' });
  assert.ok(minor.decisionFrame && consult.decisionFrame);
  assert.match(JSON.stringify(minor.decisionFrame), /家長|照顧者/);
  assert.match(JSON.stringify(minor.decisionFrame), /遊戲|喜歡/);
  assert.doesNotMatch(JSON.stringify(minor.decisionFrame), /節食|限制熱量|每週 \d/);
  assert.match(JSON.stringify(consult.decisionFrame.actions), /記錄|紀錄|詢問|諮詢/);
  const output = coaching.presentCoaching({ ...narrative(), answer: ['先記下出現胸悶的情境，帶去詢問專業人員'], actionReasons: consult.decisionFrame.actions.map(a => a.reasonFallback), barrierReasons: consult.decisionFrame.barriers.map(b => b.reasonFallback) }, consult);
  assert.equal(output.mode, 'consultation');
  assert.doesNotMatch(JSON.stringify(output.report.sections[2]), /\d+ 分鐘|每週 \d|星期一/);
  const minorConsult = context({ question: '運動後胸悶怎麼辦？' }, { age: 12 });
  assert.match(JSON.stringify(minorConsult.decisionFrame.actions), /家長|照顧者/);
  assert.match(minorConsult.decisionFrame.questionFocus.prompt, /家長|照顧者/);
});

test('fixed reason indices never recover by pruning and answer recovery remains fail closed', () => {
  const ctx = context({ setting: 'home' });
  assert.doesNotThrow(() => coaching.validateCoachingNarrative(JSON.stringify(narrative()), ctx));
  for (const field of ['actionReasons', 'barrierReasons']) {
    for (const values of [['只有理由'], ['理由甲', '理由乙', '理由丙']]) {
      assert.throws(() => coaching.validateCoachingNarrative(JSON.stringify({ ...narrative(), [field]: values }), ctx), { reason: 'schema', field });
    }
    const value = narrative(); value[field][1] = 'PRIVATE_REJECTED 跑步三十分鐘';
    assert.throws(() => coaching.validateCoachingReport(JSON.stringify(value), ctx), { reason: 'obvious_dose', field, itemIndex: 1 });
  }
  const value = narrative(); value.answer.push('PRIVATE_REJECTED 跑步三十分鐘');
  const result = coaching.validateCoachingReport(JSON.stringify(value), ctx);
  assert.equal(result.omittedItems, 1);
  assert.equal(result.selection.answer.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_REJECTED/);
});

test('model clinical escalation rebuilds the frame and omits four reasons plus the old question with complete safety', () => {
  const ctx = context({ setting: 'home', sessionMinutes: 15, availableDays: ['mon'], preferences: ['walking'] });
  const value = { ...narrative(), answer: ['把最近的身體變化和發生情境整理後帶去詢問'], needsClinicalReview: true, clinicalReason: '身體變化需要先由專業人員釐清', actionReasons: ['一般動機理由甲', '一般動機理由乙'], barrierReasons: ['一般場地理由甲', '一般場地理由乙'] };
  const recovered = coaching.validateCoachingReport(JSON.stringify(value), ctx);
  assert.equal(recovered.omittedItems, 5);
  const result = coaching.presentCoaching(recovered.selection, ctx);
  assert.equal(result.mode, 'consultation');
  assert.doesNotMatch(JSON.stringify(result.report), /一般動機理由|一般場地理由|\d+ 分鐘|星期一/);
  assert.match(result.report.summary, /諮詢|釐清/);
  assert.ok(result.report.sections[5].items.includes(value.clinicalReason));
  for (const text of [...ctx.baseline.warnings, ...ctx.risk.recommendations]) assert.ok(result.report.sections[5].items.includes(text));
});
