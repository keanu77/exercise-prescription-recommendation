// Closed vocabulary only: never put provider/user strings into diagnostics.
const reasons = Object.freeze([
  'json', 'schema', 'forbidden_numeric', 'forbidden_markup', 'forbidden_control',
  'forbidden_instruction', 'obvious_dose', 'unsafe_advice', 'citation',
  'clinical_flag', 'consultation_directive', 'minor_weightloss',
  'finish_reason', 'refusal', 'empty', 'oversize',
]);
const fields = Object.freeze([
  'summary', 'answer', 'priorities', 'practicalSteps', 'barriers', 'review',
  'nextQuestion', 'needsClinicalReview', 'clinicalReason',
]);

export function safeOutputDiagnostic(error) {
  return {
    reason: reasons.includes(error?.reason) ? error.reason : null,
    field: fields.includes(error?.field) ? error.field : null,
  };
}
