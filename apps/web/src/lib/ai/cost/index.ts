import {
  BATCH_PRICE_MULTIPLIER,
  MODEL_RATES_PER_MTOK,
  TOKENS_PER_MTOK,
  type ModelRate,
} from "@/utils/constants/model-pricing";

/**
 * Real dollar cost of recorded AI usage, computed from the tokens `ai_actions`
 * already stores. Pure — no database, no clock, no session — so it prices a
 * single row, a month, or a whole instance identically, and so it is testable
 * without booting anything.
 *
 * This is COMPUTED, not estimated: `ai_actions` carries `model`,
 * `input_tokens`, `output_tokens` and (since the master cost gate shipped)
 * `batch`, which is every input the arithmetic needs.
 */

/** The dearest rate we know of. An unknown model is priced at this rather than
 *  skipped or floored, because the two ways to be wrong are not symmetric: a
 *  ceiling that UNDER-reports spend lets an unbudgeted model run free, which is
 *  exactly the failure the gate exists to prevent. Over-reporting merely trips
 *  the gate early and is visible on the admin screen. */
const MOST_EXPENSIVE_RATE: ModelRate = Object.values(MODEL_RATES_PER_MTOK).reduce(
  (dearest, rate) =>
    rate.input + rate.output > dearest.input + dearest.output ? rate : dearest,
  { input: 0, output: 0 },
);

/**
 * Longest known key the recorded model starts with. The client records the
 * alias it requested ("claude-haiku-4-5"), but a provider or a BYO-key
 * deployment can hand back a dated snapshot ("claude-haiku-4-5-20251001"); an
 * exact-match table would price that as unknown and systematically over-report
 * Haiku traffic at Opus rates. Longest-prefix keeps snapshots on their own rate
 * while still failing safe for a model we have genuinely never heard of.
 */
function rateFor(model: string): ModelRate {
  let best: { key: string; rate: ModelRate } | null = null;
  for (const [key, rate] of Object.entries(MODEL_RATES_PER_MTOK)) {
    if (!model.startsWith(key)) continue;
    if (!best || key.length > best.key.length) best = { key, rate };
  }
  return best?.rate ?? MOST_EXPENSIVE_RATE;
}

export interface AiActionCostInput {
  /** As recorded on the `ai_actions` row. */
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Whether the call went through the Message Batches API (half price both
   *  directions). Recorded on the row — never inferred from the feature, because
   *  goal matching runs BOTH a nightly Batch pass (`goal_matching`) and a
   *  synchronous on-demand one (`goal_match_now`), and inferring "batch" for
   *  the latter would halve a real bill. */
  batch: boolean;
}

/** USD. Not rounded — callers that display it decide the precision, and a month
 *  of sub-cent nightly actions must not round to zero on the way in. */
export function costOfAiAction({
  model,
  inputTokens,
  outputTokens,
  batch,
}: AiActionCostInput): number {
  const rate = rateFor(model);
  const usd =
    (inputTokens * rate.input + outputTokens * rate.output) / TOKENS_PER_MTOK;
  return batch ? usd * BATCH_PRICE_MULTIPLIER : usd;
}

/** Sum of many priced rows — the shape every aggregate read returns. */
export function totalCostOfAiActions(rows: readonly AiActionCostInput[]): number {
  return rows.reduce((sum, row) => sum + costOfAiAction(row), 0);
}
