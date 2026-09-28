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
