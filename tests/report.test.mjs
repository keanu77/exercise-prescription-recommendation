import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateUserData} from '../functions/_lib/ai.js';
import {buildAdviceContext,presentAdvice} from '../functions/_lib/advice.js';

const cases=JSON.parse(readFileSync(new URL('./fixtures/ai-cases.json',import.meta.url))).cases;
const reportFor=data=>{
  const normalized=validateUserData(data);assert.equal(normalized.valid,true);
  const ctx=buildAdviceContext(normalized.data);
  const choice=Object.fromEntries(Object.entries(ctx.catalog).map(([g,items])=>[g,Object.keys(items).slice(0,2)]));
  return {ctx,result:presentAdvice(choice,ctx)};
};
test('detailed reports preserve every clinical baseline and required warning across 30 profiles',()=>{
  for(const c of cases) {
    const {ctx,result}=reportFor(c.data);
    assert.deepEqual(result.baseline,c.expected,c.id);
    const text=JSON.stringify(result.report);
    const safety=result.report.sections.find(s=>s.id==='safety').items;
    for(const warning of [...ctx.risk.recommendations,...ctx.baseline.warnings]) assert.ok(safety.includes(warning),c.id);
    assert.match(text,new RegExp(`${c.data.age} 歲`));
    assert.ok(result.report.sections.find(s=>s.id==='tracking').items.length>=4);
    const dose=JSON.stringify(result.report.sections.find(s=>s.id==='prescription'));
    if(ctx.consult) {
      assert.doesNotMatch(dose,/每週 \d|每日 \d|每次 \d/);
      assert.match(dose,/諮詢/);
    } else {
      assert.match(dose,new RegExp(`${ctx.baseline.time} 分鐘`));
      assert.ok(dose.includes(ctx.baseline.type.join('、')));
    }
  }
});
test('reports address all declared limitations and do not give adult weight-loss coaching to minors',()=>{
  const base=cases[0].data;
  const {result}=reportFor({...base,limitations:['time','motivation','equipment','pain','injury_history','balance']});
  const barriers=result.report.sections.find(s=>s.id==='barriers').items;
  assert.equal(barriers.length,6);
  for(const title of ['時間安排','建立動機','場地與器材','疼痛觀察','過往傷害','平衡與環境']) assert.ok(barriers.some(x=>x.startsWith(title)));
  const child=reportFor({...base,age:12,exercise_goal:'weight_loss'}).result;
  const profile=child.report.sections.find(s=>s.id==='profile').items.join('');
  assert.match(profile,/家長或照顧者/);
  assert.doesNotMatch(profile,/本次目標：減重瘦身/);
  const consult=reportFor({...base,parq_answers:{...base.parq_answers,parq_q5:'yes'}}).result;
  assert.match(JSON.stringify(consult.report.sections.find(s=>s.id==='barriers')),/用藥清單/);
});
