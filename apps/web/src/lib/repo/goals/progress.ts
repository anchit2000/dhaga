import { loadActiveGoalCohort, type ActiveGoalCohort } from "./cohort";
import { readGoalMatchPointer } from "./pointer";

/**
 * The burn-down the Home strip renders, and — the part that is new — WHY the
 * cohort looks the way it does.
 *
 * The strip previously had one shape for every empty cohort, so "we have not
 * looked yet" and "we looked and nobody matched" both rendered as "Finding
 * people", indefinitely. Both are now distinguishable from data that already
 * exists: the member rows, and `goals.last_matched_at` (stamped by
 * ./members.ts whenever a pass finishes, matches or not). Nothing here is a
 * second stored status to keep in step — `state` is derived on read, like
 * `done` is.
 *
 * Every await is SEQUENTIAL, never Promise.all (3-connection tenant pool; see
 * lib/repo/reminders/local-today.ts).
 */

/**
 * What the strip is allowed to SAY:
 *  - "unresolved": no match pass has finished for this goal yet. The only state
 *    in which "Finding people" is the truth.
 *  - "no_matches": a pass finished and left the cohort empty. Expected for an
 *    abstract objective on hosted, where hybridSearch has no semantic stage and
 *    keyword recall has no role, place or company to grab. Also covers a cohort
 *    the user skipped their way through — either way there is nobody to show,
 *    and "still searching" would be a lie.
 *  - "matched": there are members to work through; done/remaining describe it.
 */
export type GoalResolutionState = "unresolved" | "no_matches" | "matched";

export interface GoalProgress {
  objective: string;
  /** Cohort size the user is working through: matched members minus skipped. */
  total: number;
  done: number;
  remaining: number;
  /** Which of the three states above the strip should render. */
  state: GoalResolutionState;
  /** When a match pass last finished for this goal; null when none has. */
  lastMatchedAt: Date | null;
  /** A nightly Batch top-up judged against THIS goal is still in flight, so
   *  more members may arrive without the user doing anything. Never a reason to
   *  hide the cohort — only to say more may be coming. */
  topUpPending: boolean;
}

/** `total === done + remaining` by construction: all three come off the one
 *  derived-done expression in ./cohort.ts, so this and the daily slice cannot
 *  disagree about who is left. */
export async function getActiveGoalProgress(
  /** Injection slot: a caller that already loaded the cohort (Home renders the
   *  strip AND today's slice from it) passes it so the goal + cohort read once
   *  per render instead of twice — see ./cohort.ts. */
  loaded?: ActiveGoalCohort | null,
): Promise<GoalProgress | null> {
  const cohort = loaded === undefined ? await loadActiveGoalCohort() : loaded;
  if (!cohort) return null;
  const { goal, rows } = cohort;
  const done = rows.filter((row) => row.done).length;
  const pointer = await readGoalMatchPointer();
  const state: GoalResolutionState =
    rows.length > 0 ? "matched" : goal.lastMatchedAt ? "no_matches" : "unresolved";
  return {
    objective: goal.objective,
    total: rows.length,
    done,
    remaining: rows.length - done,
    state,
    lastMatchedAt: goal.lastMatchedAt,
    topUpPending: pointer?.goalId === goal.id,
  };
}
