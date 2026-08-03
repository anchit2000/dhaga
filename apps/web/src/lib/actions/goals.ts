"use server";

import { revalidatePath } from "next/cache";
import { AI_ACTION_CREDITS } from "@dhaga/core";
import {
  archiveGoal,
  createGoal,
  getActiveGoal,
  markGoalDone,
  updateGoalObjective,
} from "@/lib/repo/goals";
import { resolveGoalNow, type GoalResolveSkip } from "@/lib/ai/goal-resolve";
import { aiGateReason } from "@/lib/ai/gate";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { PreconditionError } from "@/lib/repo/errors";
import { MutationError, mutation, type MutationResult } from "@/lib/actions/mutation";

/**
 * The goal lifecycle, as the Today tile drives it.
 *
 * NONE of these take a goal id. MAX_ACTIVE_GOALS is 1, so "the active goal" is
 * unambiguous server-side, and the only thing the strip is ever given is the
 * burn-down (GoalProgress carries no id) — a client-supplied id would exist
 * purely to be looked up and re-validated.
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
 * A PLAIN DB WRITE: free, instant, no model call. Saving used to resolve the
 * cohort inline, spending ~$0.019 of inference on every save whether the user
 * wanted it then or not. Matching is the nightly Batch pass's job now, and
 * having it happen this minute is an explicit priced choice below.
 *
 * It returns no data: nothing can be skipped when nothing but the write is
 * attempted, so there is no skip reason left to carry.
 */
export async function saveGoalAction(formData: FormData): Promise<MutationResult<null>> {
  const objective = String(formData.get("objective") ?? "").trim();
  if (!objective) return { ok: false, error: "Describe what you're trying to do." };
  const r = await mutation("saveGoal", () =>
    guard(async () => {
      const active = await getActiveGoal();
      if (!active) {
        await createGoal(objective);
        return null;
      }
      await updateGoalObjective(active.id, objective);
      return null;
    }),
  );
  if (r.ok) revalidatePath("/app");
  return r;
}

/**
 * "Request now": buy the match the nightly pass would have done for free.
 *
 * The resolve is deliberately OUTSIDE mutation(): mutation() holds one scoped
 * tenant connection for the whole callback, and holding a connection across an
 * LLM call is the pool-exhaustion outage of PR #92. lib/ai/goal-resolve opens
 * its own short scopes around the model instead — so the mutation here does the
 * id lookup ONLY, and hands the resolve the ids it found.
 *
 * The skip reason is returned as data rather than raised as an error, because
 * only one of the four is legible from getActiveGoalProgress afterwards:
 * `no_candidates` stamps lastMatchedAt and reads back as "no_matches", while
 * no_llm / no_budget / failed all leave it null and are indistinguishable from
 * "nothing has run yet". Returning the reason is what lets the strip say WHICH
 * empty it is instead of an eternal spinner.
 */
export async function requestGoalMatchAction(): Promise<MutationResult<GoalResolveSkip | null>> {
  const r = await mutation("requestGoalMatch", (userId) =>
    guard(async () => {
      const active = await getActiveGoal();
      if (!active) throw new MutationError("No active goal to match.");
      return { userId, goalId: active.id, objective: active.objective };
    }),
  );
  if (!r.ok) return r;
  const { skipped } = await resolveGoalNow(r.data.userId, r.data.goalId, r.data.objective);
  revalidatePath("/app");
  return { ok: true, data: skipped };
}

/** What "Request now" costs and whether this user can spend it — read by the
 *  confirmation dialog when it opens, so the price and the refusal are both on
 *  screen BEFORE the click that would spend anything. Advisory only:
 *  `assertAiBudget` inside the resolve is still the enforcement. */
export interface GoalMatchOffer {
  credits: number;
  /** Why AI is unavailable (out of credits), or null when it is usable. */
  gate: string | null;
}

export async function goalMatchOfferAction(): Promise<GoalMatchOffer> {
  const userId = await requireUserId();
  return {
    credits: AI_ACTION_CREDITS.goal_match_now,
    // Scoped: aiGateReason reads this tenant's metering rows through getDb().
    gate: await withUserDb(userId, () => aiGateReason(userId)),
  };
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
