/**
 * What a model round-trip actually costs us, in US dollars per million tokens.
 *
 * This is the ONLY place provider prices live. Credits (packages/core's
 * `AI_ACTION_CREDITS`) are the user-facing unit and are deliberately coarse;
 * these numbers are the real bill, and the master dollar gate
 * (lib/ai/metering/dollar-cap.ts) is enforced against them rather than against
 * credits — three metered features cost 0 credits on purpose, so credits alone
 * can no longer bound spend.
 *
 * PROMPT CACHING IS NOT MODELLED, and must not be: every system prompt this app
 * sends is below the minimum cacheable prefix (Haiku 4.5 needs 4,096 tokens), so
 * the `cache_control` marker in packages/core's client is inert today.
 * docs/BRD.md §8.3 says it verbatim — "Do not model a cached-system discount."
 * If a prompt ever grows past the threshold, `ai_actions` would need cache-read
 * and cache-write token columns before a discount could honestly be applied.
 *
 * Verified against Anthropic's published rates. Re-check whenever provider
 * pricing moves — and re-derive the credit table in packages/core at the same
 * time, since that table's ~$0.006/credit blended ceiling is downstream of these.
 */
export interface ModelRate {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
}

export const MODEL_RATES_PER_MTOK: Record<string, ModelRate> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-opus-5": { input: 5.0, output: 25.0 },
};

/** The Message Batches API is half price in BOTH directions. */
export const BATCH_PRICE_MULTIPLIER = 0.5;

export const TOKENS_PER_MTOK = 1_000_000;

/**
 * The blended inference ceiling per credit that the credit table in
 * `packages/core/src/metering/credits.ts` was sized against (see its header).
 * Kept here so the admin screen can show measured $/credit NEXT TO the number
 * the pricing assumed — a drift between the two is the signal that the credit
 * table needs re-deriving, and it is invisible unless both are on screen.
 */
export const ASSUMED_USD_PER_CREDIT = 0.006;
