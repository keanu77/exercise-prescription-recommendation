// Keep provider, budget reservation and synthetic evaluation on the same ceiling.
export const COACHING_MAX_OUTPUT_TOKENS = 3500;
export const COACHING_MAX_CONTENT_CHARS = 14000;
export const COACHING_MAX_ATTEMPTS = 2;
export const COACHING_TOTAL_TIMEOUT_MS = 45000;
export const COACHING_REPAIR_MAX_BYTES = 1000;

export function coachingTokenReservation(initialInputTokenBound) {
  return {
    inputTokens: initialInputTokenBound * COACHING_MAX_ATTEMPTS + COACHING_REPAIR_MAX_BYTES * (COACHING_MAX_ATTEMPTS - 1),
    outputTokens: COACHING_MAX_OUTPUT_TOKENS * COACHING_MAX_ATTEMPTS,
  };
}
