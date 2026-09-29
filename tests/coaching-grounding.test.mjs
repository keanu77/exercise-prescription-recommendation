import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateUserData } from '../functions/_lib/ai.js';
import { buildCoachingContext, buildCoachingPrompt, validateCoachingContext, validateCoachingNarrative, validateCoachingReport, presentCoaching, COACHING_SYSTEM_PROMPT } from '../functions/_lib/coaching.js';
import { createCoachingSelection } from './helpers/coaching-fixture.mjs';
import { runCoaching } from '../functions/_lib/coaching-runner.js';

const profile = JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json', import.meta.url))).cases[0].data;
const ctx = (age = 12, input = {}) => buildCoachingContext(validateUserData({ ...profile, age }).data, validateCoachingContext(input).data);
const narrative = (text, context, field = 'answer') => {
  const value = createCoachingSelection(context); value[field][0] = text;
  return JSON.stringify(value);
};

test('adult system and user prompts remain byte-identical to v12 across unknown, home, gym and consultation contexts', () => {
  const hash = text => createHash('sha256').update(text).digest('hex');
  assert.equal(hash(COACHING_SYSTEM_PROMPT), '97f125548ef0cb5948cbaf8acd5b8cd2f0c3c163cfe185fe18e0ee0c2260d47c');
  const inputs = [{}, { setting: 'home', preferences: ['walking'], equipment: ['none'], availableDays: ['mon', 'wed'], sessionMinutes: 15, timeOfDay: 'evening', question: '在家如何減少準備？' }, { setting: 'gym', preferences: ['strength'], equipment: ['dumbbells'], availableDays: ['tue', 'thu'], sessionMinutes: 60, question: '如何準備健身房安排？' }, { setting: 'outdoors', question: '運動後胸悶怎麼辦？' }];
  const expected = ['d5373d873be44320265db54a48275b2164e881bb9bbce9431740932f7738c4e0', '8c2c49cdd80a121c88ebe198e07e73b1ae28967b80ce58e29fdab33b24ecbb18', '6fea0cbb3e2b323d1ea763a0325a88e8756aaf7f72132aa53b55bb292aad51fe', 'af374b8b6d6c58a45539d00f67475765963909476c63a0fabd1b8174f2073236'];
  inputs.forEach((input, i) => assert.equal(hash(buildCoachingPrompt(ctx(35, input))), expected[i]));
});

test('minor model input omits physiological prescription fields while the trusted report preserves the complete baseline', () => {
  const context = ctx(12, { preferences: ['ball', 'play'] });
  const baseline = structuredClone(context.baseline);
  const prompt = JSON.parse(buildCoachingPrompt(context));
  assert.deepEqual(prompt.baseline, { dosesRenderedSeparately: true });
  assert.match(prompt.constraints.minorGrounding, /preference|familiarity/i);
  assert.match(prompt.constraints.minorGrounding, /intensity|physiological/i);
  assert.match(prompt.constraints.minorGrounding, /do not claim/i);
  assert.deepEqual(context.baseline, baseline);
  const result = presentCoaching(createCoachingSelection(context), context);
  assert.deepEqual(result.baseline, baseline);
  baseline.warnings.forEach(warning => assert.ok(result.report.sections[5].items.includes(warning)));
});

test('minor observed prescription adequacy and activity-increase claims fail in answers and fixed reasons', () => {
  const context = ctx();
  const examples = [
    '這樣能保留原有處方的有氧與肌力需求，同時提升參與動機',
    '選擇熟悉的遊戲可讓孩子在安全感下自然提升活動量，符合原處方的強度需求',
    '熟悉的球類符合原處方的強度需求',
    '確認場地後就符合原處方的強度需求',
    '詢問專業人員，再用遊戲增加活動量',
    '不能保證符合原處方，但熟悉遊戲可以自然提升活動量',
  ];
  for (const text of examples) for (const field of ['answer', 'actionReasons', 'barrierReasons']) {
    const content = narrative(text, context, field);
    assert.throws(() => validateCoachingNarrative(content, context), { code: 'INVALID_OUTPUT', reason: 'unsafe_advice', field }, text);
    if (field === 'barrierReasons') {
      const result = validateCoachingReport(content, context);
      assert.equal(result.omittedItems, 1);
      assert.deepEqual(result.selection.barrierReasons, [context.decisionFrame.barriers[0].reasonFallback, createCoachingSelection(context).barrierReasons[1]]);
    } else assert.throws(() => validateCoachingReport(content, context), { reason: 'unsafe_advice', field }, text);
  }
});

test('minor suitability checks, protective negation and professional discussion remain accepted', () => {
  const context = ctx();
  for (const text of ['熟悉活動不代表符合原處方的強度需求', '不能保證保留原有處方的有氧與肌力需求', '熟悉不代表會自然提升活動量', '先確認活動是否符合原處方的強度需求', '和照顧者核對活動是否符合原處方的強度需求', '若符合原處方的強度需求，再和照顧者討論場地', '詢問專業人員熟悉的活動能否符合原處方', '喜歡的遊戲有助於減少開始前的猶豫', '保留原有處方資料，和照顧者一起討論']) {
    assert.doesNotThrow(() => validateCoachingNarrative(narrative(text, context), context), text);
  }
});

test('minor fit checks preserve scoped questions and conditions with intervening familiar activity phrases', () => {
  const context = ctx();
  for (const text of ['和家長確認哪些熟悉的遊戲符合原處方', '需要先確認所選活動是否熟悉且符合原處方', '確認哪些已熟悉且符合原處方', '和照顧者核對哪些原本熟悉的活動符合原處方', '核對所選的活動是否已熟悉並且符合原處方', '若所選活動符合原處方，再和照顧者討論場地', '如果熟悉的遊戲符合原處方，再確認可用場地']) {
    for (const field of ['answer', 'actionReasons']) assert.doesNotThrow(() => validateCoachingNarrative(narrative(text, context, field), context), text);
  }
  for (const text of ['熟悉的遊戲已經符合原處方', '和家長確認哪些熟悉的遊戲已經符合原處方', '確認場地後就符合原處方', '詢問專業人員，再選熟悉的遊戲就符合原處方', '若場地可以使用就符合原處方', '和家長確認哪些熟悉的遊戲符合原處方，這些遊戲已經符合原處方', '需要先確認所選活動是否熟悉且符合原處方，但其實已經符合原處方']) {
    assert.throws(() => validateCoachingNarrative(narrative(text, context, 'actionReasons'), context), { reason: 'unsafe_advice', field: 'actionReasons' }, text);
  }
});

test('safety assurances are rejected across ages while negation and gathering records stay valid', () => {
  for (const age of [12, 35]) {
    const context = ctx(age, { question: '活動後胸悶怎麼辦？' });
    for (const text of ['依原安全提醒處理身體變化可確保在等待諮詢期間仍維持安全', '熟悉活動能確保運動安全', '不能確保等待期間安全，但照著提醒就能確保安全']) {
      const content = narrative(text, context, 'barrierReasons');
      assert.throws(() => validateCoachingNarrative(content, context), { reason: 'unsafe_advice', field: 'barrierReasons' }, text);
      const result = validateCoachingReport(content, context);
      assert.equal(result.omittedItems, 1);
      assert.equal(result.selection.barrierReasons[0], context.decisionFrame.barriers[0].reasonFallback);
    }
    for (const text of ['不能確保等待期間安全', '無法確保在等待諮詢期間仍維持安全', '確保帶齊資料，讓諮詢容易掌握問題', '確保安全提醒資料已經帶齊']) {
      assert.doesNotThrow(() => validateCoachingNarrative(narrative(text, context), context), text);
    }
  }
});

test('repair feedback names unsafe assurances and minor adequacy without sending the rejected draft', async t => {
  const originalFetch = globalThis.fetch, originalWarn = console.warn;
  t.after(() => { globalThis.fetch = originalFetch; console.warn = originalWarn; });
  const calls = [], logs = [], context = ctx();
  const good = createCoachingSelection(context);
  const bad = { ...good, actionReasons: ['PRIVATE_DRAFT 熟悉遊戲符合原處方的強度需求', good.actionReasons[1]] };
  console.warn = line => logs.push(line);
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(calls.length === 1 ? bad : good) } }], usage: { prompt_tokens: 100, completion_tokens: 100 } });
  };
  const result = await runCoaching({ provider: 'groq', summary: buildCoachingPrompt(context), apiKey: 'PRIVATE_KEY', model: 'openai/gpt-oss-120b', context });
  assert.equal(result.attempts, 2);
  assert.equal(calls[0].messages[0].content, COACHING_SYSTEM_PROMPT);
  const repair = calls[1].messages[0].content.slice(COACHING_SYSTEM_PROMPT.length);
  assert.match(repair, /safety assurances/i);
  assert.match(repair, /minor.*prescription.fit/i);
  assert.ok(Buffer.byteLength(repair) <= 1000);
  assert.equal(calls[1].messages[1].content, calls[0].messages[1].content);
  assert.doesNotMatch(JSON.stringify([calls[1], logs]), /PRIVATE_DRAFT|PRIVATE_KEY/);
});
