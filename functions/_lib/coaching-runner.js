import { callProvider } from './ai.js';
import { coachingSchema, validateCoachingNarrative, COACHING_SYSTEM_PROMPT } from './coaching.js';
import { safeOutputDiagnostic } from './ai-diagnostics.js';
import { COACHING_MAX_OUTPUT_TOKENS, COACHING_MAX_CONTENT_CHARS, COACHING_MAX_ATTEMPTS, COACHING_TOTAL_TIMEOUT_MS, COACHING_REPAIR_MAX_BYTES } from './coaching-limits.js';

const retryable = error => error?.code === 'INVALID_OUTPUT' || (error?.code === 'UPSTREAM_ERROR' && error.upstreamStatus === 400 && error.upstreamCode === 'json_validate_failed');
const timeout = () => Object.assign(new Error('Coaching deadline exceeded'), { name: 'TimeoutError' });

function repairFeedback(error) {
  const diagnostic = error?.code === 'INVALID_OUTPUT' ? safeOutputDiagnostic(error) : { reason: 'schema', field: null, doseKind: null };
  const feedback = `\n\nTrusted validation feedback: ${JSON.stringify(diagnostic)}\nRegenerate the complete JSON response using the original inputs and constraints. Do not repeat the rejected content. No numeric or vague exercise doses, new exercise movements, diagnoses, medication changes, sources, or claims that exercise targets are complete. Use useful qualitative choices and reasons. Preserve consultation and minor restrictions. All required fields must match the schema. Only the server supplies exercise quantities.`;
  // The budget reserves this same maximum; never include an error message or draft.
  if (new TextEncoder().encode(feedback).byteLength > COACHING_REPAIR_MAX_BYTES) throw new Error('Repair feedback exceeds budget');
  return feedback;
}

export async function runCoaching({ provider, summary, apiKey, model, context }) {
  if (provider !== 'groq') throw new Error('Unsupported coaching provider');
  const deadline = Date.now() + COACHING_TOTAL_TIMEOUT_MS;
  const schema = coachingSchema();
  const usage = { inputTokens: 0, outputTokens: 0 };
  let feedback = '';
  for (let attempt = 1; attempt <= COACHING_MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw timeout();
    let providerReturned = false;
    try {
      const result = await callProvider(provider, summary, apiKey, model, context, { systemPrompt: COACHING_SYSTEM_PROMPT + feedback, schema, schemaName: 'personal_coaching', maxOutputTokens: COACHING_MAX_OUTPUT_TOKENS, maxContentChars: COACHING_MAX_CONTENT_CHARS, reasoningEffort: 'medium', timeoutMs: remaining });
      providerReturned = true;
      for (const key of ['inputTokens', 'outputTokens']) {
        const count = result.usage?.[key];
        usage[key] = usage[key] === null || !Number.isSafeInteger(count) || count < 0 ? null : usage[key] + count;
      }
      if (Date.now() >= deadline) throw timeout();
      const selection = validateCoachingNarrative(result.content, context);
      return { selection, usage, attempts: attempt };
    } catch (error) {
      // A provider validation error may still incur charges without returning usage.
      // Keep the full reservation and do not report partial usage as a total.
      if (!providerReturned) { usage.inputTokens = null; usage.outputTokens = null; }
      if (!retryable(error) || attempt >= COACHING_MAX_ATTEMPTS) throw error;
      if (Date.now() >= deadline) throw timeout();
      feedback = repairFeedback(error);
      console.warn(JSON.stringify({ event: 'ai_retry', provider, model, attempt, ...safeOutputDiagnostic(error), upstreamCode: error.upstreamCode === 'json_validate_failed' ? 'json_validate_failed' : null }));
    }
  }
  throw new Error('Coaching attempts exhausted');
}
