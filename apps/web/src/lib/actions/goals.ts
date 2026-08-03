"use server";

import { revalidatePath } from "next/cache";
import {
  archiveGoal,
  createGoal,
  getActiveGoal,
  markGoalDone,
  updateGoalObjective,
} from "@/lib/repo/goals";
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
 */
export async function saveGoalAction(formData: FormData): Promise<MutationResult<null>> {
  const objective = String(formData.get("objective") ?? "").trim();
  if (!objective) return { ok: false, error: "Describe what you're trying to do." };
  const r = await mutation("saveGoal", () =>
    guard(async () => {
      const active = await getActiveGoal();
      if (active) await updateGoalObjective(active.id, objective);
      else await createGoal(objective);
      return null;
    }),
  );
  if (r.ok) revalidatePath("/app");
  return r;
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
