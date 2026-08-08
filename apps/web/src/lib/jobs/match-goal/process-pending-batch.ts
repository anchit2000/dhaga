import { goalMatchSchema, type BatchLLMClient } from "@dhaga/core";
import { errorFields } from "@dhaga/core/src/logging";
import { recordAiAction } from "@/lib/ai/metering";
import { recordGoalMatchRun, type GoalMatchVerdict } from "@/lib/repo/goals";
import { GOAL_MATCH_BATCH_KEY, setPendingBatchId } from "@/lib/repo/settings";
import type { ScopedRunner } from "@/lib/jobs/tenant-sweep";

export type PendingBatchOutcome = { done: false } | { done: true; matched: number };

/**
 * Phase 1: apply a finished match batch as `goal_members` rows on the goal the
 * batch was SUBMITTED for — `pending.goalId` off the settings pointer, never
 * "whatever goal is active tonight" (see ./index: the user may have reworded or
 * replaced the goal while the batch was in flight).
 *
 * Only `matches === true` becomes a member. The insert itself — rank clamping,
 * cohort headroom, best-fit-first ordering, and the `last_matched_at` stamp — is
 * `recordGoalMatchRun` (lib/repo/goals/members.ts), shared with the synchronous
 * resolve so the two passes cannot drift apart on any of it.
 *
 * NOT SET HERE: `goals.resolved_at`. In lib/repo/goals/write.ts and the DDL that
 * column is the TERMINAL timestamp, written only alongside status done/archived;
 * stamping it while the goal is still active would make an in-progress goal read
 * as closed. "A pass has run" is `last_matched_at`, a separate column.
 *
 * Metered as `goal_matching` — its own feature, not folded into
 * `person_classification`, so an operator can tell the two nightly passes apart
 * on cost. Both are priced at 0 credits.
 */
export async function processPendingBatch(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
  pending: { batchId: string; goalId: string },
): Promise<PendingBatchOutcome> {
  let isDone: boolean;
  try {
    isDone = await batchClient.isBatchDone(pending.batchId);
  } catch {
    // Transient status-check failure — retry next run rather than discard a
    // batch we can't confirm has finished.
    return { done: false };
  }
  if (!isDone) return { done: false };

  try {
    const results = await batchClient.getBatchResults(pending.batchId, goalMatchSchema);
    const matched = await runScoped(async () => {
      const accepted: GoalMatchVerdict[] = [];
      // Metering is best-effort per result (see the catch below), so the misses
      // are tallied here and reported ONCE after the loop: a batch carries a
      // result per recalled contact, and a line each would bury the only number
      // that matters — how much spend never reached the ledger.
      const unmetered = { results: 0, inputTokens: 0, outputTokens: 0 };
      let unmeteredModel: string | null = null;
      let lastRecordError: unknown = null;
      for (const result of results) {
        if (result.status !== "succeeded" || !result.data || !result.model || !result.usage) {
          // errored/expired/canceled — unbilled by Anthropic, and this contact
          // is simply recalled again on a later run.
          continue;
        }
        try {
          // Message Batches API — half price both directions. THIS is why
          // batch-ness is recorded rather than inferred from the feature:
          // lib/ai/goal-resolve runs the same `goal_matching` feature
          // SYNCHRONOUSLY at full price, so the feature alone cannot say.
          await recordAiAction("goal_matching", result.model, result.usage, { batch: true });
          if (result.data.matches) accepted.push({ contactId: result.id, fit: result.data.fit });
        } catch (failure) {
          // One result failing to meter must never drop the whole batch.
          unmetered.results++;
          unmetered.inputTokens += result.usage.inputTokens;
          unmetered.outputTokens += result.usage.outputTokens;
          unmeteredModel = result.model;
          lastRecordError = failure;
        }
      }
      // WHAT WENT UNMETERED on this BATCH pass. Anthropic billed these tokens
      // (at the batch half-price the `batch: true` flag above records), but no
      // `ai_actions` row landed, so the month's usage reads low and no ceiling
      // can see the spend. That bites hardest HERE: `goal_matching` is priced at
      // 0 credits, so the dollar cap is its ONLY ceiling and these rows are the
      // whole of what it would have counted. Reconcile the counts against the
      // provider bill. Model id and counts only — never a contact or a verdict.
      if (unmetered.results > 0) {
        console.error("[goal-matching] batch usage record failed (batch kept)", {
          feature: "goal_matching",
          batch: true,
          model: unmeteredModel,
          unmeteredResults: unmetered.results,
          inputTokens: unmetered.inputTokens,
          outputTokens: unmetered.outputTokens,
          ...errorFields(lastRecordError),
        });
      }
      const inserted = await recordGoalMatchRun(pending.goalId, accepted);
      await setPendingBatchId(GOAL_MATCH_BATCH_KEY, null);
      return inserted;
    });
    return { done: true, matched };
  } catch {
    // Done, but results couldn't be downloaded or the scoped write failed —
    // keep the pointer and retry next run rather than lose the night's matches.
    return { done: false };
  }
}
