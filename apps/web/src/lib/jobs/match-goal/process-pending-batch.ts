import { goalMatchSchema, type BatchLLMClient } from "@dhaga/core";
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
        } catch {
          // One result failing to meter must never drop the whole batch.
        }
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
