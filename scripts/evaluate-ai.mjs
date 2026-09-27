#!/usr/bin/env node
// Synthetic-only evaluation. Never logs prompts/keys; review text contains only fixtures.
// AI_EVAL_URL defaults to a required explicit endpoint. Optional provider + BYOK env.
import fs from 'node:fs';
import {validateUserData,buildUserSummary,SYSTEM_PROMPT} from '../functions/_lib/ai.js';
import {buildAdviceContext,adviceSchema} from '../functions/_lib/advice.js';
import {MODELS,DEFAULT_MODELS} from '../functions/_lib/models.js';
const endpoint=process.env.AI_EVAL_URL;
if(!endpoint || !/^https:\/\//.test(endpoint)) throw new Error('Set AI_EVAL_URL to the HTTPS API endpoint');
const provider=process.env.AI_EVAL_PROVIDER||'groq';
if(!MODELS[provider]) throw new Error('Unknown provider');
const model=process.env.AI_EVAL_MODEL||DEFAULT_MODELS[provider];
const pricing=MODELS[provider].models.find(m=>m.id===model);
if(!pricing) throw new Error('Unknown model');
const customApiKey=process.env[MODELS[provider].envKey]||null;
const output=process.env.AI_EVAL_OUTPUT||'.claude/audit/ai-redesign-20260927/evaluation.json';
const repeats=Number(process.env.AI_EVAL_REPEATS||3);
if(!Number.isInteger(repeats)||repeats<1||repeats>3) throw new Error('AI_EVAL_REPEATS must be 1..3');
if(fs.existsSync(output)) throw new Error('Evaluation output exists; choose a new AI_EVAL_OUTPUT to preserve prior costs and evidence');
const cases=JSON.parse(fs.readFileSync('tests/fixtures/ai-cases.json')).cases;
const report={provider,model,startedAt:new Date().toISOString(),budgetUSD:10,reservedUSD:0,reportedCostUSD:0,results:[],humanReview:'pending'};
const persist=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
for(const c of cases) for(let repeat=0;repeat<repeats;repeat++) {
 const ctx=buildAdviceContext(validateUserData(c.data).data);
 const bytes=Buffer.byteLength(SYSTEM_PROMPT+buildUserSummary(c.data,ctx)+JSON.stringify(adviceSchema(ctx)))+1000;
 const reserve=(bytes*pricing.inputUSD+1800*pricing.outputUSD)/1e6;
 if(report.reservedUSD+reserve>report.budgetUSD){report.stopped='budget';persist();process.exit(2);}
 report.reservedUSD+=reserve;persist(); // reservation survives interruption; no retry of uncertain calls
 const started=Date.now();
 let result;
 try {
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schemaVersion:2,userData:c.data,provider,model,customApiKey}),signal:AbortSignal.timeout(45000)});
  const r=await response.json();
  const success=response.ok&&r.success&&r.schemaVersion===2&&JSON.stringify(r.baseline)===JSON.stringify(ctx.baseline);
  result={case:c.id,repeat:repeat+1,status:response.status,success:Boolean(success),durationMs:Date.now()-started,meta:r.meta||null,mode:r.mode||null,advice:r.advice||null,error:r.error||null};
  if(r.meta?.estimatedCostUSD) report.reportedCostUSD+=r.meta.estimatedCostUSD;
 } catch {result={case:c.id,repeat:repeat+1,success:false,error:'request_failed',durationMs:Date.now()-started};}
 report.results.push(result);persist();
 console.log(JSON.stringify({completed:report.results.length,total:cases.length*repeats,success:result.success,status:result.status,case:c.id}));
 if(report.results.length<cases.length*repeats) await new Promise(resolve=>setTimeout(resolve,7000));
}
const times=report.results.map(r=>r.durationMs).sort((a,b)=>a-b);
report.summary={completed:report.results.length,passed:report.results.filter(r=>r.success).length,p95Ms:times[Math.ceil(times.length*.95)-1]};
report.finishedAt=new Date().toISOString();persist();console.log(JSON.stringify(report.summary));
