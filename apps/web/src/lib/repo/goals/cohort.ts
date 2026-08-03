import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, eventContacts, goalMembers, notes } from "@/lib/db/schema";
import { surfaceableContact } from "@/lib/repo/contacts/surfaceable";
// Deep import, not the @/lib/repo/daily-suggestions barrel: that barrel pulls in
// the suggestion engine, which imports this file for the daily slice. ./score
// depends on nothing here, so there is no cycle (same idiom as facts.ts
// importing @/lib/repo/contacts/surfaceable).
import { hashId } from "@/lib/repo/daily-suggestions/score";
import { lastTouchSql } from "@/lib/repo/last-touch";
import { GOAL_DAILY_SLICE, GOAL_RANK_BAND } from "@/utils/constants/goals";
import { getActiveGoal } from "./write";

/**
 * The goal read side: today's slice for the suggestion engine, and the burn-down
 * for the UI.
 *
 * DONE IS DERIVED, NEVER STORED. A member is done once the contact's last touch
 * (lastTouchSql — a note, an event scan, an explicit "I reached out") has moved
 * past `matched_at`. There is no `done` state and `markReachedOut` deliberately
 * writes nothing here: it has six callers, none of which know goals exist, so a
 * stored flag would go stale the moment the user acted anywhere other than the
 * goal tile. Because both functions below read that one expression, the
 * pending list and the progress count cannot disagree — writing a note about
 * someone IS contacting them, and both surfaces learn it at the same instant.
 *
 * Every await is SEQUENTIAL, never Promise.all (3-connection tenant pool; see
 * lib/repo/reminders/local-today.ts).
 */

export interface GoalCohortMember {
  contactId: string;
  /** The match pass's fit 0..100, frozen at match time. */
  rank: number;
}

/** Today's slice plus the two facts the reason copy needs, so the suggestion
 *  engine gets the whole goal term in one round-trip. */
export interface GoalCohortSlice {
  goalId: string;
  objective: string;
  /** Cohort members not yet reached out to, including the ones in `members`. */
  remaining: number;
  members: GoalCohortMember[];
}

export interface GoalProgress {
  objective: string;
  /** Cohort size the user is working through: matched members minus skipped. */
  total: number;
  done: number;
  remaining: number;
}

interface CohortRow extends GoalCohortMember {
  done: boolean;
}

/**
 * Every member of one goal the user is still working through — skipped rows
 * excluded ("not this person" is a judgment nothing else in the graph records),
 * non-surfaceable rows excluded (lib/repo/contacts/surfaceable.ts: a member
 * later classified as a service is not someone to volunteer). Bounded by
 * GOAL_COHORT_MAX, so it needs no LIMIT of its own.
 */
async function loadCohort(goalId: string): Promise<CohortRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      contactId: goalMembers.contactId,
      rank: goalMembers.rank,
      done: sql<boolean>`${lastTouchSql} > ${goalMembers.matchedAt}`,
    })
    .from(goalMembers)
    .innerJoin(contacts, eq(contacts.id, goalMembers.contactId))
    // lastTouchSql's join contract (see lib/repo/last-touch.ts): both touch
    // tables joined in, soft-deleted notes excluded, GROUP BY the contact.
    .leftJoin(notes, and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)))
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(and(eq(goalMembers.goalId, goalId), eq(goalMembers.state, "pending"), surfaceableContact))
    .groupBy(goalMembers.id, contacts.id);
  return rows.map((row) => ({ ...row, done: Boolean(row.done) }));
}

/**
 * Which cohort members today's slice comes from. PURE function of (rows,
 * dayIndex), matching ../daily-suggestions/score.ts's purity contract — no clock
 * and no database, so the slice is identical on every render within a day.
 *
 * Rank is BANDED (4 bands of width GOAL_RANK_BAND) rather than compared
 * outright, then rotated by a day-keyed hash. Both halves are load-bearing:
 * pure `rank DESC` shows the same three faces every morning until one of them
 * is contacted, so the cohort stalls behind whoever the user is least inclined
 * to message; pure rotation throws away the model's judgment and treats a fit
 * of 95 as interchangeable with 5. Banding keeps the judgment at the resolution
 * it is actually good for and lets rotation decide the rest.
 */
export function orderGoalCohort(rows: GoalCohortMember[], dayIndex: number): GoalCohortMember[] {
  const band = (rank: number): number => Math.floor(rank / GOAL_RANK_BAND);
  return [...rows].sort(
    (a, b) =>
      band(b.rank) - band(a.rank) ||
      hashId(`${a.contactId}:${dayIndex}`) - hashId(`${b.contactId}:${dayIndex}`) ||
      a.contactId.localeCompare(b.contactId),
  );
}

/** Up to GOAL_DAILY_SLICE people for today. Null when no goal is active — the
 *  suggestion engine then scores exactly as it did before goals existed. */
export async function listGoalCohortSlice(dayIndex: number): Promise<GoalCohortSlice | null> {
  const goal = await getActiveGoal();
  if (!goal) return null;
  const rows = await loadCohort(goal.id);
  const pending = rows.filter((row) => !row.done);
  return {
    goalId: goal.id,
    objective: goal.objective,
    remaining: pending.length,
    members: orderGoalCohort(pending, dayIndex).slice(0, GOAL_DAILY_SLICE),
  };
}

/** The burn-down: `total === done + remaining` by construction, because all
 *  three come off the one derived-done expression above. */
export async function getActiveGoalProgress(): Promise<GoalProgress | null> {
  const goal = await getActiveGoal();
  if (!goal) return null;
  const rows = await loadCohort(goal.id);
  const done = rows.filter((row) => row.done).length;
  return { objective: goal.objective, total: rows.length, done, remaining: rows.length - done };
}
