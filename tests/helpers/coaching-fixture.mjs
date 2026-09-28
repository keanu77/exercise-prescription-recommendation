// Synthetic browser/API fixture only. These strings are not generated-model evidence.
import { validateUserData } from '../../functions/_lib/ai.js';
import { validateCoachingContext, buildCoachingContext, validateCoachingNarrative, presentCoaching, RULES_VERSION } from '../../functions/_lib/coaching.js';

export function createCoachingSelection(ctx) {
  const c = ctx.coachingContext;
  const consult = ctx.consult;
  const place = { home: '家中動線', gym: '健身房動線與交通', outdoors: '戶外場地與天候', pool: '泳池開放情形', flexible: '可用場地' }[c.setting];
  const equipment = c.equipment.includes('dumbbells') ? '整理啞鈴用品，先確認原處方與熟悉程度' : c.equipment.includes('bands') ? '把彈力帶收在準備用品旁，確認是否適合既有安排' : c.equipment.includes('none') ? '先盤點不需添購器材的準備方式' : '確認已有用品，不急著添購';
  return {
    summary: consult ? '把你最想解決的生活困難整理成具體問題，讓諮詢能直接討論可行的安排' : `先釐清${place}，把準備接到生活中可行的提示，減少每次重新決定的負擔`,
    answer: [consult ? '目前最有用的是把困難發生的情境、身體感受與想恢復的活動一起記下，帶著原處方詢問哪些安排需要調整' : c.question ? `針對你提出的安排問題，可先查看${place}，${equipment}，再決定用品要放在哪裡最容易開始準備` : '你還沒有提出特定問題，可先選原處方中熟悉的活動，盤點可用場地與用品；目前不知道的生活時段先保留待確認'],
    priorities: [{ action: consult ? '整理想改善的日常困難' : `先確認${place}`, reason: consult ? '用實際生活情境說明問題，才能討論適合個人狀態的安排' : '場地與準備若不順手，即使知道原處方也容易卡在開始之前' }, { action: equipment, reason: '先使用已確認可用的資源，降低臨時找用品造成的阻力' }],
    practicalSteps: [{ action: consult ? '準備諮詢問題紀錄' : '把準備用品放在容易看到的位置', whenWhere: c.timeOfDay === 'evening' ? '如果晚上安排容易被打斷，先選回家後固定會做的事作為提醒' : '尚未確認固定生活提示時，可以先想想哪件原本就會做的事適合接上準備' }],
    barriers: [{ obstacle: '如果預定時段臨時被打斷', alternative: consult ? '把被打斷的原因一起寫下，諮詢時討論真正可用的時段' : '保留用品準備並重新確認行事曆，不把錯過的活動加倍補回' }],
    review: ['記下原先準備與實際執行之間的差異，找出最常卡住的環節'],
    nextQuestion: c.availableDays.length ? '已提供的時段裡，最常被什麼事情打斷？' : '通常哪些日子比較能留出準備與活動的時間？',
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
