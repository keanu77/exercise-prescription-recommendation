#!/usr/bin/env node
// Synthetic-only small-batch evaluation. No keys in logs/artifacts; no uncertain retries.
import fs from 'node:fs';
import path from 'node:path';
import { validateUserData } from '../functions/_lib/ai.js';
import { buildCoachingContext, validateCoachingContext, buildCoachingPrompt, coachingSchema, COACHING_SYSTEM_PROMPT } from '../functions/_lib/coaching.js';
import { COACHING_MAX_OUTPUT_TOKENS } from '../functions/_lib/coaching-limits.js';
import { buildAdviceContext, presentAdvice } from '../functions/_lib/advice.js';
import { MODELS, DEFAULT_MODELS } from '../functions/_lib/models.js';

const endpoint = process.env.AI_EVAL_URL;
if (!endpoint || !/^https:\/\//.test(endpoint)) throw new Error('Set AI_EVAL_URL to the HTTPS API endpoint');
const provider = process.env.AI_EVAL_PROVIDER || 'groq';
if (provider !== 'groq') throw new Error('The coaching endpoint supports Groq only');
const model = process.env.AI_EVAL_MODEL || DEFAULT_MODELS[provider];
const pricing = MODELS[provider].models.find(m => m.id === model);
if (!pricing) throw new Error('Unknown model');
const customApiKey = process.env[MODELS[provider].envKey] || null;
const output = process.env.AI_EVAL_OUTPUT || '.claude/audit/personal-coaching-20260928/evaluation.json';
const repeats = Number(process.env.AI_EVAL_REPEATS || 1);
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 2) throw new Error('AI_EVAL_REPEATS must be 1..2');
if (fs.existsSync(output)) throw new Error('Evaluation output exists; choose a new AI_EVAL_OUTPUT to preserve prior costs and evidence');
const fixtures = JSON.parse(fs.readFileSync('tests/fixtures/ai-cases.json')).cases;
const base = { ...fixtures[0].data, age: 35, health_status: 'healthy', diseases: [], limitations: ['time'], fitness_level: 'good', exercise_goal: 'health', parq_answers: Object.fromEntries(Array.from({ length: 7 }, (_, i) => ['parq_q' + (i + 1), 'no'])) };
const allCases = [
  { id: 'home-short', data: base, coachingContext: { question: '下班後很累，只想在家開始，怎麼減少準備？', availableDays: ['mon', 'wed', 'fri'], sessionMinutes: 15, timeOfDay: 'evening', setting: 'home', equipment: ['none'], preferences: ['walking'] } },
  { id: 'gym-long', data: base, coachingContext: { question: '週末可去健身房，也有啞鈴，如何減少臨時決定的負擔？', availableDays: ['sat', 'sun'], sessionMinutes: 60, timeOfDay: 'morning', setting: 'gym', equipment: ['dumbbells', 'machines'], preferences: ['strength', 'cycling'] } },
  { id: 'unknown-context', data: base, coachingContext: {} },
  { id: 'minor', data: { ...base, age: 12, exercise_goal: 'weight_loss' }, coachingContext: { question: '我不喜歡跑步，但喜歡跟同學玩，該怎麼開始？', setting: 'outdoors', preferences: ['play', 'ball'] } },
  { id: 'symptom-question', data: base, coachingContext: { question: '爬樓梯會胸悶，還可以照處方跑步嗎？', availableDays: ['mon', 'wed'], sessionMinutes: 20, setting: 'outdoors' } },
  { id: 'consultation', data: { ...base, parq_answers: { ...base.parq_answers, parq_q2: 'yes' } }, coachingContext: { question: '很想重新開始，但看診前我可以先準備什麼？', availableDays: ['sat'], sessionMinutes: 30, setting: 'home', equipment: ['bands'] } },
];
const selected = process.env.AI_EVAL_CASES?.split(',').map(x => x.trim()).filter(Boolean);
if (selected?.some(id => !allCases.some(c => c.id === id)) || selected && new Set(selected).size !== selected.length) throw new Error('AI_EVAL_CASES contains unknown or duplicate ids');
const cases = selected?.length ? allCases.filter(c => selected.includes(c.id)) : allCases;
const report = { provider, model, syntheticOnly: true, startedAt: new Date().toISOString(), budgetUSD: 1, reservedUSD: 0, reportedCostUSD: 0, outputTokenCeiling: COACHING_MAX_OUTPUT_TOKENS, results: [], humanReview: 'pending', criteria: 'Automated success covers transport, report structure and baseline preservation only; usefulness, factual accuracy and clinical suitability need human review' };
fs.mkdirSync(path.dirname(output), { recursive: true });
const persist = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
evaluation: for (const c of cases) for (let repeat = 0; repeat < repeats; repeat++) {
  const data = validateUserData(c.data).data;
  const ctx = buildCoachingContext(data, validateCoachingContext(c.coachingContext).data);
  const bytes = Buffer.byteLength(COACHING_SYSTEM_PROMPT + buildCoachingPrompt(ctx) + JSON.stringify(coachingSchema())) + 1000;
  const reserve = (bytes * pricing.inputUSD + COACHING_MAX_OUTPUT_TOKENS * pricing.outputUSD) / 1e6;
  if (report.reservedUSD + reserve > report.budgetUSD) { report.stopped = 'budget'; persist(); process.exit(2); }
  report.reservedUSD += reserve; persist();
  const legacy = buildAdviceContext(data);
  const legacyChoice = Object.fromEntries(Object.entries(legacy.catalog).map(([key, items]) => [key, Object.keys(items).slice(0, 2)]));
  const started = Date.now();
  let result;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schemaVersion: 3, userData: c.data, coachingContext: c.coachingContext, provider, model, customApiKey }), signal: AbortSignal.timeout(65000), redirect: 'error' });
    const r = await response.json();
    const ids = r.report?.sections?.map(s => s.id);
    const success = response.ok && r.success && r.schemaVersion === 3 && r.report?.version === 2 && JSON.stringify(ids) === JSON.stringify(['answer', 'priorities', 'plan', 'barriers', 'review', 'safety']) && JSON.stringify(r.baseline) === JSON.stringify(ctx.baseline);
    result = { case: c.id, repeat: repeat + 1, status: response.status, success: Boolean(success), durationMs: Date.now() - started, meta: r.meta || null, retryAfter: response.headers.get('Retry-After'), mode: r.mode || null, report: r.report || null, error: r.error || null };
    if (typeof r.meta?.estimatedCostUSD === 'number') report.reportedCostUSD += r.meta.estimatedCostUSD;
  } catch { result = { case: c.id, repeat: repeat + 1, success: false, error: 'request_failed', durationMs: Date.now() - started }; }
  result.syntheticInput = { userData: c.data, coachingContext: c.coachingContext };
  result.legacyTemplateComparison = presentAdvice(legacyChoice, legacy).report;
  report.results.push(result); persist();
  console.log(JSON.stringify({ completed: report.results.length, total: cases.length * repeats, success: result.success, status: result.status, case: c.id }));
  if (result.status === 429 || result.status === 503) { report.stopped = 'upstream_limit'; persist(); break evaluation; }
  if (report.results.length < cases.length * repeats) await new Promise(resolve => setTimeout(resolve, 7000));
}
const times = report.results.map(r => r.durationMs).sort((a, b) => a - b);
report.summary = { completed: report.results.length, passed: report.results.filter(r => r.success).length, p95Ms: times[Math.ceil(times.length * .95) - 1] };
report.finishedAt = new Date().toISOString(); persist(); console.log(JSON.stringify(report.summary));
