// Synthetic browser/API fixture only. These strings are not generated-model evidence.
import { validateUserData } from '../../functions/_lib/ai.js';
import { validateCoachingContext, buildCoachingContext, buildDecisionFrame, validateCoachingNarrative, presentCoaching, RULES_VERSION } from '../../functions/_lib/coaching.js';

export function createCoachingSelection(ctx) {
  const normalized = { ...ctx, coachingContext: validateCoachingContext(ctx.coachingContext).data };
  const frame = ctx.decisionFrame || buildDecisionFrame(normalized);
  return {
    answer: [ctx.consult ? '把困難發生的情境、身體感受與想釐清的問題整理後帶去諮詢，讓專業人員對照原處方說明' : normalized.coachingContext.question ? '針對你提出的安排問題，先確認場地與熟悉程度，能減少準備後才發現條件不合的負擔' : '你還沒有提出特定問題，先確認喜歡且熟悉的活動與可用條件，可以縮小需要另外釐清的範圍'],
    actionReasons: frame.actions.map(action => action.reasonFallback),
    barrierReasons: frame.barriers.map(barrier => barrier.reasonFallback),
    nextQuestion: frame.questionFocus.prompt,
    needsClinicalReview: false,
    clinicalReason: '',
  };
}

export function createCoachingResponse(data, coachingContext = {}) {
  const profile = validateUserData(data);
  const context = validateCoachingContext(coachingContext);
  if (!profile.valid || !context.valid) throw new Error('Invalid synthetic fixture input');
  const ctx = buildCoachingContext(profile.data, context.data);
  const selection = validateCoachingNarrative(JSON.stringify(createCoachingSelection(ctx)), ctx);
  return { success: true, schemaVersion: 3, ...presentCoaching(selection, ctx), meta: { provider: 'groq', model: 'openai/gpt-oss-120b', promptVersion: 'synthetic-fixture-1', rulesVersion: RULES_VERSION, generatedAt: '2026-09-28T00:00:00.000Z', durationMs: 1, usage: { inputTokens: 100, outputTokens: 300 }, estimatedCostUSD: 0.000195, omittedItems: 0 } };
}
