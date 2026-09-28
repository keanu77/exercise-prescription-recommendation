import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callProvider } from '../functions/_lib/ai.js';

test('coaching may request more reasoning while diagnostics never expose provider text', async t => {
  const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original;});
  for(const code of ['json_validate_failed','PRIVATE_CODE']) {
    globalThis.fetch=async (_url,init)=>{
      assert.equal(JSON.parse(init.body).reasoning_effort,'medium');
      return Response.json({error:{code,message:'PRIVATE_MESSAGE',failed_generation:'PRIVATE_GENERATION'}},{status:400});
    };
    await assert.rejects(()=>callProvider('groq','synthetic','synthetic-key','model',{}, {schema:{},reasoningEffort:'medium'}),error=>{
      assert.equal(error.upstreamStatus,400);
      assert.equal(error.upstreamCode,code==='json_validate_failed'?code:null);
      assert.doesNotMatch(JSON.stringify(error),/PRIVATE/);
      return true;
    });
  }
});

// Targeted examples seen in synthetic live generations, not a complete clinical classifier
test('coaching rejects reproduced invented routines and false target-completion claims', async () => {
  const { validateCoachingNarrative } = await import('../functions/_lib/coaching.js');
  const { createCoachingSelection } = await import('./helpers/coaching-fixture.mjs');
  for (const text of ['改為原地踏步', '可以先做簡短的伸展', '直接進行站立式抬腿', '換上舒適的拖鞋', '完成有氧與肌力目標', '省去腳踏車環節']) {
    const value = createCoachingSelection({ consult:false, coachingContext:{ setting:'home', equipment:['none'], availableDays:[], question:'', timeOfDay:'flexible' } }); value.answer=[text];
    assert.throws(()=>validateCoachingNarrative(JSON.stringify(value)), {code:'INVALID_OUTPUT',reason:'unsafe_advice'},text);
  }
});
