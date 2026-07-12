/**
 * Response contract for GET /api/jobs/detect-signals — the nightly signal-
 * detection cron entrypoint (BRD §6.7). Types only: deep-import this module
 * directly, same as capture.ts.
 */

/**
 * Why the sweep produced nothing, if it did. "batch_pending" is specific to
 * the Batch API redesign (CLAUDE.md's "Nightly/latency-insensitive jobs:
 * Batch API" rule): the job submits classification prompts as one Anthropic
 * Message Batch per run and applies its results on a *later* run once the
 * batch finishes (batches are asynchronous, up to 24h) — if the previous
 * run's batch hasn't finished yet, this run does no new work and reports
 * that instead of silently returning zeros.
 */
export type SignalDetectionSkipReason = "no_search" | "no_llm" | "batch_pending";

/** Success shape. Always 200 — a skipped/empty sweep is not an error. */
export interface SignalDetectionSummary {
  scanned: number;
  created: number;
  skipped: SignalDetectionSkipReason | null;
}

/** Error body for all non-2xx statuses (401 — bad/missing cron secret). */
export interface DetectSignalsErrorResponse {
  error: string;
}
