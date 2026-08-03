"use server";

import { revalidatePath } from "next/cache";
import {
  archiveGoal,
  createGoal,
  getActiveGoal,
  markGoalDone,
  updateGoalObjective,
} from "@/lib/repo/goals";
import { resolveGoalNow, type GoalResolveSkip } from "@/lib/ai/goal-resolve";
import { PreconditionError } from "@/lib/repo/errors";
import { MutationError, mutation, type MutationResult } from "@/lib/actions/mutation";

/**
 * The goal lifecycle, as the Today tile drives it.
 *
 * NONE of these take a goal id. MAX_ACTIVE_GOALS is 1, so "the active goal" is
 * unambiguous server-side, and the only thing the strip is ever given is the
 * burn-down (GoalProgress carries no id) — a client-supplied id would exist
 * purely to be looked up and re-validated. Resolving it inside the mutation
 * also keeps the read and the write on the ONE scoped tenant connection
 * mutation() opens, rather than a second checkout from a 3-connection pool.
 *
 * Everything revalidates /app: Today is the only surface a goal renders on.
 */

/** Same guard as companies actions: a repo PreconditionError carries
 *  hand-written, user-safe copy ("Keep the goal under 200 characters…") and is
 *  surfaced verbatim; anything else propagates so mutation() logs it PII-safe
 *  and returns the generic transient message. */
async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PreconditionError) throw new MutationError(error.message);
    throw error;
  }
}

/**
 * Write the objective: create the first goal, or reword the live one. One
 * action rather than two because the strip's dialog is one dialog — the user is
 * stating what they want, and whether a row already exists is our bookkeeping.
 *
 * THEN RESOLVE IT, INLINE. Matching used to be nightly-cron-only, so stating a
 * goal did nothing visible for up to 24 hours (and nothing ever, on a
 * deployment with no cron) — the strip sat on "Finding people" and users read
 * it as a hang. The resolve is deliberately OUTSIDE the mutation() above:
 * mutation() holds one scoped tenant connection for the whole callback, and
 * holding a connection across an LLM call is the pool-exhaustion outage of
 * PR #92. lib/ai/goal-resolve opens its own short scopes around the model
 * instead.
 *
 * Its outcome is not surfaced as an action ERROR: the save SUCCEEDED, and
 * failing it would tell the user their goal was not written.
 *
 * But the skip reason IS returned as data, because only one of the five is
 * legible from getActiveGoalProgress. `no_candidates` finishes a pass and
 * stamps lastMatchedAt, so the strip reads it as "no_matches" — the other four
 * (no_llm, rate_limited, no_budget, failed) all leave lastMatchedAt null and
 * are indistinguishable from "nothing has run yet". Returning the reason is
 * what lets the strip say WHICH empty it is instead of an eternal spinner.
 *
 * A no-op reword does not resolve, and so reports no skip. Re-judging the same
 * candidates against the same words costs the same ~$0.019 and can only produce
 * the same cohort, and it would burn a slot in a 3-a-day fuse.
 */
export async function saveGoalAction(
  formData: FormData,
): Promise<MutationResult<GoalResolveSkip | null>> {
  const objective = String(formData.get("objective") ?? "").trim();
  if (!objective) return { ok: false, error: "Describe what you're trying to do." };
  const r = await mutation("saveGoal", (userId) =>
    guard(async () => {
      const active = await getActiveGoal();
      if (!active) return { userId, goalId: (await createGoal(objective)).id, resolve: true };
      await updateGoalObjective(active.id, objective);
      return { userId, goalId: active.id, resolve: active.objective !== objective };
    }),
  );
  if (!r.ok) return r;
  const skipped = r.data.resolve
    ? (await resolveGoalNow(r.data.userId, r.data.goalId, objective)).skipped
    : null;
  revalidatePath("/app");
  return { ok: true, data: skipped };
}

/** Both terminal states stop matching; only one is a success, so the outcome is
 *  the parameter. Runs INSIDE each action's mutation() scope — the two actions
 *  call mutation() themselves rather than sharing a wrapper, so the
 *  action-db-scope guard test can see the scope on every action it checks. */
async function closeActiveGoal(resolve: (goalId: string) => Promise<void>): Promise<null> {
  return guard(async () => {
    const active = await getActiveGoal();
    if (!active) throw new MutationError("No active goal to close.");
    await resolve(active.id);
    return null;
  });
}

/** The user got what they wanted. */
export async function markGoalDoneAction(): Promise<MutationResult<null>> {
  const r = await mutation("markGoalDone", () => closeActiveGoal(markGoalDone));
  if (r.ok) revalidatePath("/app");
  return r;
}

/** The user stopped caring. */
export async function archiveGoalAction(): Promise<MutationResult<null>> {
  const r = await mutation("archiveGoal", () => closeActiveGoal(archiveGoal));
  if (r.ok) revalidatePath("/app");
  return r;
}
