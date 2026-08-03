import { randomUUID } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { goals } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";
import { GOAL_OBJECTIVE_MAX_CHARS, MAX_ACTIVE_GOALS } from "@/utils/constants/goals";
import type { GoalRow } from "@/lib/db/schema";

/**
 * The goal write side: create, edit, archive, mark done.
 *
 * MAX_ACTIVE_GOALS is enforced HERE, in the repo write — not by a schema
 * constraint. Creating a goal when the ceiling is already met ARCHIVES the
 * oldest active one rather than failing: "one goal at a time" is a product
 * decision about what Today can show (utils/constants/goals.ts), and a user
 * stating a new objective has already told us the old one is over. A unique
 * index instead would turn that into an error the user has to resolve by
 * finding and closing a goal they no longer care about.
 *
 * Every await is SEQUENTIAL, never Promise.all: the tenant connection pool tops
 * out at 3 and fanning getDb() out causes production 500s (see
 * lib/repo/reminders/local-today.ts).
 */

/** The objective is stored VERBATIM (it is the line the user reads back), so
 *  the only normalisation is trimming — and the only rejections are the two
 *  that make it unusable as a prompt or as a label. */
function normalizeObjective(objective: string): string {
  const text = objective.trim();
  if (text.length === 0) throw new PreconditionError("Describe what you're trying to do.");
  if (text.length > GOAL_OBJECTIVE_MAX_CHARS) {
    throw new PreconditionError(
      `Keep the goal under ${GOAL_OBJECTIVE_MAX_CHARS} characters — a sentence, not a brief.`,
    );
  }
  return text;
}

/** The one live goal, newest first. Null when the user has never set one (or
 *  closed the last one) — every goal surface treats that as "no tile". */
export async function getActiveGoal(): Promise<GoalRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(goals)
    .where(eq(goals.status, "active"))
    .orderBy(desc(goals.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Create a goal, archiving whatever the ceiling leaves no room for. Written
 * against MAX_ACTIVE_GOALS rather than hardcoding "archive the one active
 * goal", so raising the constant is the only edit a second concurrent goal
 * needs — it stays a product decision, not a migration.
 */
export async function createGoal(objective: string): Promise<GoalRow> {
  const text = normalizeObjective(objective);
  const db = await getDb();
  const active = await db
    .select({ id: goals.id })
    .from(goals)
    .where(eq(goals.status, "active"))
    .orderBy(desc(goals.createdAt));
  // Keep the newest (MAX_ACTIVE_GOALS - 1); the incoming goal takes the last slot.
  const evicted = active.slice(Math.max(MAX_ACTIVE_GOALS - 1, 0)).map((row) => row.id);
  if (evicted.length > 0) {
    const now = new Date();
    await db
      .update(goals)
      .set({ status: "archived", resolvedAt: now, updatedAt: now })
      .where(inArray(goals.id, evicted));
  }
  const [created] = await db
    .insert(goals)
    .values({ id: randomUUID(), objective: text })
    .returning();
  return created;
}

/**
 * Reword a goal in place. The cohort is deliberately NOT cleared: members were
 * matched against the old wording, and dropping them would silently discard
 * work the user is part-way through. The next match run judges against the new
 * objective and tops the cohort up.
 */
export async function updateGoalObjective(goalId: string, objective: string): Promise<void> {
  const text = normalizeObjective(objective);
  const db = await getDb();
  await db
    .update(goals)
    .set({ objective: text, updatedAt: new Date() })
    .where(eq(goals.id, goalId));
}

/** Both terminal states stop matching; only one of them is a success, which is
 *  why "done" and "archived" are separate values rather than one `closed`. */
async function resolveGoal(goalId: string, status: "done" | "archived"): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db
    .update(goals)
    .set({ status, resolvedAt: now, updatedAt: now })
    .where(eq(goals.id, goalId));
}

/** The user got what they wanted. */
export async function markGoalDone(goalId: string): Promise<void> {
  await resolveGoal(goalId, "done");
}

/** The user stopped caring. Members are kept — the cohort is a record of what
 *  was matched, and re-activating is not a thing we ask them to rebuild. */
export async function archiveGoal(goalId: string): Promise<void> {
  await resolveGoal(goalId, "archived");
}
