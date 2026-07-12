/**
 * Every volatile (per-call) prompt that reasons about recency should carry
 * today's date — the model's training cutoff is not "now", and this
 * product constantly judges freshness (job changes, "last touch", relative
 * follow-up timing). This belongs in the user prompt, never the system
 * prompt: system prompts are cached as one stable block (see
 * anthropic-client/shared.ts's cachedSystem()), so a date baked in there
 * would invalidate the cache breakpoint every single day.
 *
 * Deliberately not used by prompts with no temporal judgment to make (e.g.
 * card-scan OCR transcription) — it would just be noise there.
 */
export function todayLine(): string {
  return `Today's date: ${new Date().toISOString().slice(0, 10)}`;
}
