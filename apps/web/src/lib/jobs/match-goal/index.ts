import { getBatchLLMClient, hasBatchLLM, type BatchLLMClient } from "@dhaga/core";
import { forEachTenant, hostedTenantIds, runOnGlobal, type ScopedRunner } from "@/lib/jobs/tenant-sweep";
import { GOAL_MATCH_BATCH_KEY, getPendingBatchId } from "@/lib/repo/settings";
import { processPendingBatch } from "./process-pending-batch";
import { submitNewBatch } from "./submit-new-batch";

export type GoalMatchSkipReason = "no_llm" | "no_goal" | "batch_pending";

/**
 * `matched` is members inserted this run from the previous night's batch;
 * `remaining` is how many cohort slots are still free (GOAL_COHORT_MAX minus the
 * cohort), i.e. the gauge that counts DOWN as the cohort accretes.
 */
export interface GoalMatchSummary {
  scanned: number;
  matched: number;
  remaining: number;
  skipped: GoalMatchSkipReason | null;
}

/**
 * Nightly goal matching: judge the contacts deterministically recalled for the
 * user's active objective and record the ones that serve it as `goal_members`.
 * Retrieval is a query (`recallGoalCandidates` — no LLM, CLAUDE.md Rule 5); the
 * model is used only for the judgment call it is actually for.
 *
 * ACCRETIVE BY DESIGN, NOT BY ACCIDENT. `hybridSearch` returns at most 20 hits
 * (its own final slice, lib/repo/search/index.ts), so one run can add at most
 * ~20 members however large GOAL_RECALL_POOL is. That ceiling is left in place
 * deliberately: widening it would mean topping the pool up with arbitrary
 * contacts, which is exactly the "whole graph" pool the constant exists to
 * avoid, and every extra candidate costs prompt tokens. Because this job runs
 * every night and skips contacts already matched, a cohort simply builds toward
 * GOAL_COHORT_MAX over several nights. `remaining` in the summary is how an
 * operator watches that happen — a cohort that is not yet full is expected on
 * night one, not a silent shortfall.
 *
 * Two-phase over the Message Batches API for the same reason as detect-signals
 * and classify-people: batches are asynchronous (up to 24h) and this cron fires
 * once a day, so a run applies the PREVIOUS batch and submits a fresh one.
 *
 * THE POINTER CARRIES THE GOAL, not just the batch id. A batch judged against
 * one objective can land on a night when the user has already replaced or
 * archived that goal; without the goal id the results would be filed under
 * whatever is active now, i.e. members matched against wording the user never
 * asked about. Anthropic caps `custom_id` at 64 characters, so two UUIDs will
 * not fit there — the goal id rides the settings value instead
 * ("<batchId>|<goalId>"), which stays opaque to lib/repo/settings.
 */
export async function runGoalMatching(): Promise<GoalMatchSummary> {
  if (!hasBatchLLM()) return { scanned: 0, matched: 0, remaining: 0, skipped: "no_llm" };

  const batchClient = getBatchLLMClient();
  const tenantIds = await hostedTenantIds();

  // Self-host / core-only: one global pass, deliberately NOT a per-tenant loop
  // (without a tenant gate withUserDb doesn't scope, so looping users would
  // re-judge the same goal once per user).
  if (tenantIds === null) return sweepTenant(runOnGlobal, batchClient);

  const summaries = await forEachTenant(tenantIds, "match-goal-sweep", (runScoped) =>
    sweepTenant(runScoped, batchClient),
  );
  let scanned = 0;
  let matched = 0;
  let remaining = 0;
  for (const summary of summaries) {
    scanned += summary.scanned;
    matched += summary.matched;
    remaining += summary.remaining;
  }
  return { scanned, matched, remaining, skipped: null };
}

/** Splits the "<batchId>|<goalId>" pointer. Anything malformed is treated as no
 *  pending batch — the pass then just submits a fresh one. */
function parsePointer(value: string): { batchId: string; goalId: string } | null {
  const separator = value.indexOf("|");
  if (separator <= 0) return null;
  const goalId = value.slice(separator + 1);
  return goalId ? { batchId: value.slice(0, separator), goalId } : null;
}

async function sweepTenant(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
): Promise<GoalMatchSummary> {
  const pointer = await runScoped(() => getPendingBatchId(GOAL_MATCH_BATCH_KEY));
  const pending = pointer ? parsePointer(pointer) : null;

  let matchedFromPreviousBatch = 0;
  if (pending) {
    const outcome = await processPendingBatch(runScoped, batchClient, pending);
    if (!outcome.done) return { scanned: 0, matched: 0, remaining: 0, skipped: "batch_pending" };
    matchedFromPreviousBatch = outcome.matched;
  }

  return submitNewBatch(runScoped, batchClient, matchedFromPreviousBatch);
}
