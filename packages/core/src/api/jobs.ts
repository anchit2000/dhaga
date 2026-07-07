/**
 * Response contract for GET /api/jobs/detect-signals — the nightly signal-
 * detection cron entrypoint (BRD §6.7). Types only: deep-import this module
 * directly, same as capture.ts.
 */

/** Why the sweep produced nothing, if it did. */
export type SignalDetectionSkipReason = "no_search" | "no_llm";

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
