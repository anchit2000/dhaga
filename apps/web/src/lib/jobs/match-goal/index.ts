import { getBatchLLMClient, hasBatchLLM, type BatchLLMClient } from "@dhaga/core";
import { forEachTenant, hostedTenantIds, runOnGlobal, type ScopedRunner } from "@/lib/jobs/tenant-sweep";
import { readGoalMatchPointer } from "@/lib/repo/goals";
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
 * THIS IS THE TOP-UP, NOT THE FIRST PASS. A goal is resolved synchronously the
 * moment it is created or reworded (lib/ai/goal-resolve.ts) — Batch takes
 * minutes to hours, which is unusable for someone who just stated an objective
 * and is looking at the tile. This pass exists for what a cheap 50%-discounted
 * overnight run is actually good at: widening a cohort as the graph grows.
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
 * THE POINTER CARRIES THE GOAL, not just the batch id — see
 * lib/repo/goals/pointer.ts for why, and for the one definition of its format.
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

async function sweepTenant(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
): Promise<GoalMatchSummary> {
  // Pointer format and parsing live in lib/repo/goals/pointer.ts — the read
  // side needs them too, to tell the strip a top-up is still in flight.
  const pending = await runScoped(readGoalMatchPointer);

  let matchedFromPreviousBatch = 0;
  if (pending) {
    const outcome = await processPendingBatch(runScoped, batchClient, pending);
    if (!outcome.done) return { scanned: 0, matched: 0, remaining: 0, skipped: "batch_pending" };
    matchedFromPreviousBatch = outcome.matched;
  }

  return submitNewBatch(runScoped, batchClient, matchedFromPreviousBatch);
}
