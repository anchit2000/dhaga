import { getBatchLLMClient, hasBatchLLM, hasSearch } from "@dhaga/core";
import type { SignalDetectionSummary } from "@dhaga/core/src/api/jobs";
import { getPendingSignalBatchId } from "@/lib/repo/settings";
import { processPendingBatch } from "./process-pending-batch";
import { submitNewBatch } from "./submit-new-batch";

/**
 * Nightly signal detection (BRD §5.2 v1.2, §6.7): web-search each watched
 * contact, classify the results with Haiku, write a `signals` row on a
 * genuine hit. Job-change detection and the news watchlist are the same
 * sweep — `kind` on the row is what distinguishes them.
 *
 * Runs through Anthropic's Message Batches API (CLAUDE.md: "Nightly/
 * latency-insensitive jobs: Batch API") instead of one Haiku call per
 * contact — half the token cost, and this job has no latency requirement
 * to trade away. Batches are asynchronous (minutes up to 24h) and this cron
 * fires once a day (Vercel Hobby's cron limit is once-daily), so a single
 * invocation can never submit a batch and also wait for it — that would
 * mean blocking up to 24h inside a ~300s function. Instead this is a
 * two-phase job spread across runs:
 *   - phase 1 (./process-pending-batch): apply the results of whatever
 *     batch was submitted on the *previous* run, if it has finished.
 *   - phase 2 (./submit-new-batch): search every contact newly due for a
 *     rescan and submit their classification prompts as one fresh batch
 *     for the *next* run to pick up.
 * Net effect: a contact's signal lands roughly a day after it becomes due,
 * instead of immediately — an honest tradeoff for a job that was already
 * nightly and latency-insensitive by design, in exchange for never holding
 * a cron invocation open waiting on an async batch.
 *
 * Runs against the default (non-tenant-scoped) connection, same as the
 * Telegram webhook — correct for self-host today. Full per-tenant RLS
 * scoping for Dhaga Cloud's multi-tenant mode is a follow-up (tracked in
 * docs/checklist.md alongside the rest of the packages/ee boundary).
 */
export async function runSignalDetection(): Promise<SignalDetectionSummary> {
  if (!hasSearch()) return { scanned: 0, created: 0, skipped: "no_search" };
  if (!hasBatchLLM()) return { scanned: 0, created: 0, skipped: "no_llm" };

  const batchClient = getBatchLLMClient();
  const pendingBatchId = await getPendingSignalBatchId();

  let createdFromPreviousBatch = 0;
  if (pendingBatchId) {
    const outcome = await processPendingBatch(batchClient, pendingBatchId);
    if (!outcome.done) {
      return { scanned: 0, created: 0, skipped: "batch_pending" };
    }
    createdFromPreviousBatch = outcome.created;
  }

  return submitNewBatch(batchClient, createdFromPreviousBatch);
}
