import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateUserData } from '../functions/_lib/ai.js';
import { buildCoachingContext, buildCoachingPrompt, validateCoachingContext, validateCoachingNarrative, validateCoachingReport, COACHING_SYSTEM_PROMPT } from '../functions/_lib/coaching.js';
import { createCoachingSelection } from './helpers/coaching-fixture.mjs';

const profile = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases[0].data;
const context = (age = 12, exercise_goal = 'weight_loss') => buildCoachingContext(validateUserData({ ...profile, age, exercise_goal }).data, validateCoachingContext({ preferences: ['play'], sessionMinutes: 15 }).data);
const withAnswer = (text, ctx) => JSON.stringify({ ...createCoachingSelection(ctx), answer: [text] });

test('minor goal projection uses enjoyable familiar activities without changing clinical inputs or baselines', () => {
  for (const goal of ['health', 'weight_loss', 'muscle_building', 'endurance', 'rehabilitation', 'performance']) {
    const ctx = context(12, goal);
    const before = JSON.stringify({ data: ctx.data, baseline: ctx.baseline, consult: ctx.consult });
    const prompt = JSON.parse(buildCoachingPrompt(ctx));
    assert.equal(prompt.profile.goal, 'enjoyable_familiar_activities', goal);
    assert.equal(ctx.data.exercise_goal, goal);
    assert.equal(JSON.stringify({ data: ctx.data, baseline: ctx.baseline, consult: ctx.consult }), before);
    assert.deepEqual(ctx.baseline, globalThis.ExerciseRules.calculateFITTVP(ctx.data));
    if (goal === 'rehabilitation') assert.equal(prompt.constraints.consultation, true);
  }
  assert.equal(JSON.parse(buildCoachingPrompt(context(35))).profile.goal, 'weight_loss');
});

test('minor validator rejects the observed weight-loss endorsement and aligned reason variants', () => {
  const ctx = context();
  for (const text of ['這樣既符合減重目標又能保持玩樂的動機', '這樣有助於減重', '熟悉遊戲能幫助達成減重目標', '這能支持瘦身目標', '先降低體重再考慮其他活動', '不能宣稱符合減重目標，但這樣有助減重', '先和醫師討論，再利用遊戲減重']) {
    assert.throws(() => validateCoachingNarrative(withAnswer(text, ctx), ctx), { code: 'INVALID_OUTPUT', reason: 'minor_weightloss', field: 'answer' }, text);
    assert.throws(() => validateCoachingReport(withAnswer(text, ctx), ctx), { reason: 'minor_weightloss' }, text);
  }
  for (const field of ['actionReasons', 'barrierReasons']) {
    const value = createCoachingSelection(ctx); value[field][1] = '這樣既符合減重目標又能保持玩樂的動機';
    assert.throws(() => validateCoachingNarrative(JSON.stringify(value), ctx), { reason: 'minor_weightloss', field, itemIndex: 1 });
    if (field === 'barrierReasons') {
      const result = validateCoachingReport(JSON.stringify(value), ctx);
      assert.equal(result.omittedItems, 1);
      assert.deepEqual(result.selection.barrierReasons, [value.barrierReasons[0], ctx.decisionFrame.barriers[1].reasonFallback]);
    } else assert.throws(() => validateCoachingReport(JSON.stringify(value), ctx), { reason: 'minor_weightloss', field, itemIndex: 1 });
  }
});

test('minor boundary preserves bounded negation and questions for clinical discussion', () => {
  const ctx = context();
  for (const text of ['不需節食減重', '不套用成人熱量目標', '不套用成人減重目標', '不要把活動當成減重工具', '不應宣稱符合減重目標', '這不代表符合減重目標', '不需要降低體重', '不以減重為目標，先關注喜歡且熟悉的活動', '詢問醫師是否需要降低體重', '減重相關的疑問應和照顧者及醫師討論', '用藥問題與減重疑問都應帶去諮詢', '你提到減重目標，先把疑問帶去諮詢']) {
    assert.doesNotThrow(() => validateCoachingNarrative(withAnswer(text, ctx), ctx), text);
  }
});

test('the concise prompt confines short windows to preparation friction and disallows minor weight-loss endorsement', () => {
  assert.match(COACHING_SYSTEM_PROMPT, /Short windows.*preparation.*never.*complet/i);
  assert.match(COACHING_SYSTEM_PROMPT, /minors.*never.*endorse.*weight.loss/i);
});
