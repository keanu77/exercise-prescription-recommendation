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
  for (const text of ['可在客廳原地踏步', '即可滿足有氧部分的需求', '改為原地踏步', '可以先做簡短的伸展', '直接進行站立式抬腿', '換上舒適的拖鞋', '完成有氧與肌力目標', '省去腳踏車環節', '只穿襪子', '不能保證完成有氧與肌力目標，但這樣就能完成有氧與肌力目標', '避免只穿襪子，改穿拖鞋']) {
    const value = createCoachingSelection({ consult:false, coachingContext:{ setting:'home', equipment:['none'], availableDays:[], question:'', timeOfDay:'flexible' } }); value.answer=[text];
    assert.throws(()=>validateCoachingNarrative(JSON.stringify(value)), {code:'INVALID_OUTPUT',reason:'unsafe_advice'},text);
  }
});

test('protective target and footwear statements remain accepted', async () => {
  const { validateCoachingNarrative } = await import('../functions/_lib/coaching.js');
  const { createCoachingSelection } = await import('./helpers/coaching-fixture.mjs');
  for (const text of ['目前尚未完成有氧與肌力目標', '這個安排不代表已經完成有氧與肌力目標', '不能保證完成有氧與肌力目標', '避免只穿襪子', '換上襪子與合腳的運動鞋', '先穿襪子再穿運動鞋']) {
    const value = createCoachingSelection({ consult:false, coachingContext:{ setting:'home', equipment:['none'], availableDays:[], question:'', timeOfDay:'flexible' } }); value.answer=[text];
    assert.deepEqual(validateCoachingNarrative(JSON.stringify(value)).answer,[text]);
  }
});

test('Qwen structured output uses bounded reasoning and never returns reasoning as content', async t => {
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async (_url,init)=>{
    const sent=JSON.parse(init.body);
    assert.equal(sent.reasoning_effort,'medium');assert.equal(sent.reasoning_format,'hidden');
    assert.equal(sent.response_format.json_schema.strict,true);
    return Response.json({choices:[{message:{content:'{}',reasoning:'PRIVATE_THOUGHTS'},finish_reason:'stop'}]});
  };
  const r=await callProvider('groq','synthetic','synthetic-key','qwen/qwen3.8-27b',{}, {schema:{}});
  assert.equal(r.content,'{}');assert.doesNotMatch(JSON.stringify(r),/PRIVATE_THOUGHTS/);
});

test('English placeholders cannot pass as a completed Traditional Chinese report', async () => {
 const {validateCoachingNarrative}=await import('../functions/_lib/coaching.js');
 const {createCoachingSelection}=await import('./helpers/coaching-fixture.mjs');
 const value=createCoachingSelection({consult:false,coachingContext:{setting:'home',equipment:[],availableDays:[],question:'',timeOfDay:'flexible'}});
 value.actionReasons[0]='Do not mention this field.';
 assert.throws(()=>validateCoachingNarrative(JSON.stringify(value)),{code:'INVALID_OUTPUT',reason:'language',field:'actionReasons'});
});

test('vague preparation/rest time is distinct from a new exercise duration', async () => {
 const {validateCoachingNarrative}=await import('../functions/_lib/coaching.js');
 const {createCoachingSelection}=await import('./helpers/coaching-fixture.mjs');
 const value=createCoachingSelection({consult:false,coachingContext:{setting:'home',equipment:[],availableDays:[],question:'',timeOfDay:'flexible'}});
 for (const text of ['先休息幾分鐘，再確認原本安排是否可行','花幾分鐘整理用品','記錄胸悶持續幾分鐘']) {
  value.answer=[text];assert.deepEqual(validateCoachingNarrative(JSON.stringify(value)).answer,[text]);
 }
 for (const text of ['先走幾分鐘','準備跑步幾分鐘','準備幾分鐘快走','準備幾分鐘的輕度快走','準備幾分鐘慢跑','準備幾分鐘的有氧運動','準備幾分鐘 快走','休息幾分鐘的慢跑','先花幾分鐘整理用品，然後走數分鐘','縮短為幾分鐘，等感覺恢復再延長']) {
  value.answer=[text];assert.throws(()=>validateCoachingNarrative(JSON.stringify(value)),{reason:'obvious_dose'});
 }
 for (const text of ['休息幾分鐘再跑步','休息幾分鐘，然後快走','休息幾分鐘後恢復運動','和醫師討論前可以先開始跑步']) {
  value.answer=[text];assert.throws(()=>validateCoachingNarrative(JSON.stringify(value),{consult:true}),{reason:'consultation_directive'});
 }
 for (const text of ['休息幾分鐘，不要再跑步','詢問醫師能否恢復運動','詢問醫師是否可以恢復運動','確認何時可以恢復運動']) {
  value.answer=[text];assert.deepEqual(validateCoachingNarrative(JSON.stringify(value),{consult:true}).answer,[text]);
 }
});
