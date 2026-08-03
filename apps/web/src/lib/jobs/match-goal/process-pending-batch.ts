import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { goalMatchSchema, type BatchLLMClient } from "@dhaga/core";
import { recordAiAction } from "@/lib/ai/metering";
import { getDb } from "@/lib/db/request-scope";
import { goalMembers } from "@/lib/db/schema";
import { GOAL_COHORT_MAX } from "@/utils/constants/goals";
import { GOAL_MATCH_BATCH_KEY, setPendingBatchId } from "@/lib/repo/settings";
import type { ScopedRunner } from "@/lib/jobs/tenant-sweep";

export type PendingBatchOutcome = { done: false } | { done: true; matched: number };

/** `rank` is an integer column and `fit` is a model-produced number, so it is
 *  clamped rather than trusted: a schema can describe 0–100, not enforce it. */
function toRank(fit: number): number {
  if (!Number.isFinite(fit)) return 0;
  return Math.min(Math.max(Math.round(fit), 0), 100);
}

/**
 * Phase 1: apply a finished match batch as `goal_members` rows on the goal the
 * batch was SUBMITTED for — `pending.goalId` off the settings pointer, never
 * "whatever goal is active tonight" (see ./index: the user may have reworded or
 * replaced the goal while the batch was in flight).
 *
 * Only `matches === true` becomes a member; `fit` is frozen into `rank` at match
 * time and never recomputed on read (lib/db/ddl/core/goals.ts). Inserts are
 * capped at the cohort headroom and ordered best-fit-first, so a batch larger
 * than the remaining room keeps the strongest matches. `onConflictDoNothing` on
 * the (goal_id, contact_id) unique index makes a re-applied batch a no-op.
 *
 * NOT SET HERE: `goals.resolved_at`. In lib/repo/goals/write.ts and the DDL that
 * column is the TERMINAL timestamp, written only alongside status done/archived;
 * stamping it while the goal is still active would make an in-progress goal read
 * as closed. Nothing currently reads it for a "matching has run" state, so this
 * pass leaves the goal lifecycle entirely to the repo that owns it.
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
      const db = await getDb();
      const accepted: { contactId: string; rank: number }[] = [];
      for (const result of results) {
        if (result.status !== "succeeded" || !result.data || !result.model || !result.usage) {
          // errored/expired/canceled — unbilled by Anthropic, and this contact
          // is simply recalled again on a later run.
          continue;
        }
        try {
          await recordAiAction("goal_matching", result.model, result.usage);
          if (result.data.matches) {
            accepted.push({ contactId: result.id, rank: toRank(result.data.fit) });
          }
        } catch {
          // One result failing to meter must never drop the whole batch.
        }
      }
      const [cohort] = await db
        .select({ total: count() })
        .from(goalMembers)
        .where(eq(goalMembers.goalId, pending.goalId));
      const room = GOAL_COHORT_MAX - (cohort?.total ?? 0);
      const rows = accepted
        .sort((a, b) => b.rank - a.rank || a.contactId.localeCompare(b.contactId))
        .slice(0, Math.max(room, 0))
        .map((row) => ({
          id: randomUUID(),
          goalId: pending.goalId,
          contactId: row.contactId,
          rank: row.rank,
        }));
      if (rows.length > 0) {
        await db
          .insert(goalMembers)
          .values(rows)
          .onConflictDoNothing({ target: [goalMembers.goalId, goalMembers.contactId] });
      }
      await setPendingBatchId(GOAL_MATCH_BATCH_KEY, null);
      return rows.length;
    });
    return { done: true, matched };
  } catch {
    // Done, but results couldn't be downloaded or the scoped write failed —
    // keep the pointer and retry next run rather than lose the night's matches.
    return { done: false };
  }
}
