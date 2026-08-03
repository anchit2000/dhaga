import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { goalMembers, goals } from "@/lib/db/schema";
import { GOAL_COHORT_MAX } from "@/utils/constants/goals";

/**
 * How a match pass RECORDS ITS OUTCOME — the one write both passes share.
 *
 * There are two of them now (the synchronous resolve on save,
 * lib/ai/goal-resolve.ts, and the nightly Batch top-up,
 * lib/jobs/match-goal/process-pending-batch.ts) and they must agree on three
 * things that are easy to get subtly different in two copies: how the model's
 * fit becomes an integer rank, how the cohort ceiling is applied, and — most
 * importantly — that a pass which matched NOBODY still counts as having run.
 *
 * Every await is SEQUENTIAL, never Promise.all (3-connection tenant pool; see
 * lib/repo/reminders/local-today.ts).
 */

/** One contact the pass judged a match, with the model's raw 0..100 fit. */
export interface GoalMatchVerdict {
  contactId: string;
  fit: number;
}

/** `rank` is an integer column and `fit` is a model-produced number, so it is
 *  clamped rather than trusted: a schema can describe 0–100, not enforce it. */
export function toRank(fit: number): number {
  if (!Number.isFinite(fit)) return 0;
  return Math.min(Math.max(Math.round(fit), 0), 100);
}

/**
 * Insert the accepted matches and stamp `goals.last_matched_at`. Returns how
 * many members were actually inserted.
 *
 * THE STAMP IS UNCONDITIONAL — it happens even when `accepted` is empty. That
 * empty case is the one the Home strip could not previously describe: an
 * abstract objective ("reach out to people I'm already in touch with") recalls
 * poorly on hosted, where hybridSearch has no semantic stage, so a completed
 * pass with zero matches is a NORMAL outcome, not a failure. Without the stamp
 * it is indistinguishable from "nothing has run yet" and the tile says
 * "Finding people" forever. Callers must therefore only reach this function
 * once the pass genuinely finished; a pass that failed outright must not call
 * it (see lib/ai/goal-resolve.ts).
 *
 * Inserts are capped at the cohort headroom and ordered best-fit-first, so a
 * batch larger than the remaining room keeps the strongest matches.
 * `onConflictDoNothing` on the (goal_id, contact_id) unique index makes a
 * re-applied batch a no-op.
 */
export async function recordGoalMatchRun(
  goalId: string,
  accepted: GoalMatchVerdict[],
): Promise<number> {
  const db = await getDb();
  const [cohort] = await db
    .select({ total: count() })
    .from(goalMembers)
    .where(eq(goalMembers.goalId, goalId));
  const room = GOAL_COHORT_MAX - (cohort?.total ?? 0);
  const rows = accepted
    .map((verdict) => ({ contactId: verdict.contactId, rank: toRank(verdict.fit) }))
    .sort((a, b) => b.rank - a.rank || a.contactId.localeCompare(b.contactId))
    .slice(0, Math.max(room, 0))
    .map((row) => ({ id: randomUUID(), goalId, contactId: row.contactId, rank: row.rank }));
  if (rows.length > 0) {
    await db
      .insert(goalMembers)
      .values(rows)
      .onConflictDoNothing({ target: [goalMembers.goalId, goalMembers.contactId] });
  }
  await db.update(goals).set({ lastMatchedAt: new Date() }).where(eq(goals.id, goalId));
  return rows.length;
}
