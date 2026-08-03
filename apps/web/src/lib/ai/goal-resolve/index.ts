import { hasLLM } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import {
  loadGoalSubjectContext,
  recallGoalCandidates,
  recordGoalMatchRun,
  type GoalMatchVerdict,
} from "@/lib/repo/goals";
import { userToday } from "@/lib/repo/reminders/local-today";
import { GOAL_SYNC_RESOLVE_CAP } from "@/utils/constants/goals";
import { AiBudgetError, assertAiBudget, recordAiAction, withAiAction } from "../metering";
import { judgeCandidate, type GoalJudgement } from "./judge";

/**
 * Resolve a goal's cohort NOW, because the user pressed "Request now".
 *
 * Matching is nightly by default: saving a goal is a free, instant DB write and
 * the Batch pass fills the cohort overnight. This path is the paid shortcut for
 * someone who does not want to wait — so it uses plain `extract` (Haiku) rather
 * than the 50%-cheaper Batch API, whose minutes-to-hours turnaround is exactly
 * what the user is paying to skip.
 *
 * THE POOL HAZARD is the thing to preserve when editing this file. The tenant
 * pool caps at 3 connections and a connection held across an LLM call took out
 * /app in production (PR #92). So the shape is: acquire → read → RELEASE → call
 * the model → re-acquire → write. Each `withUserDb` below is one short scope,
 * and the model calls sit BETWEEN them, never inside one. ./judge.ts cannot
 * open a connection at all, which is what keeps that true by construction.
 *
 * Cost: metered as `goal_match_now` — its OWN feature, priced in real credits
 * (packages/core/src/metering/credits.ts), unlike the free nightly
 * `goal_matching` pass. CREDITS ARE THE FUSE: `assertAiBudget` refuses once the
 * month's allowance is spent, and the dollar ceiling backstops unlimited-credit
 * plans. There is deliberately no longer a per-day rate-limit bucket — that
 * existed only because this path used to be free, and refusing a user who is
 * paying for the run would be a second, worse fuse on top of the price.
 */

export type GoalResolveSkip = "no_llm" | "no_budget" | "no_candidates" | "failed";

export interface GoalResolveOutcome {
  matched: number;
  skipped: GoalResolveSkip | null;
}

/** One request = one metered action, however many contacts it judges. */
export function resolveGoalNow(
  userId: string,
  goalId: string,
  objective: string,
): Promise<GoalResolveOutcome> {
  return withAiAction("goal_match_now", () => runGoalResolve(userId, goalId, objective));
}

async function runGoalResolve(
  userId: string,
  goalId: string,
  objective: string,
): Promise<GoalResolveOutcome> {
  if (!hasLLM()) return { matched: 0, skipped: "no_llm" };

  try {
    // Scope 1: budget check, retrieval and context — released before the model.
    const prepared = await withUserDb(userId, async () => {
      await assertAiBudget(userId);
      const candidates = (await recallGoalCandidates(objective, goalId)).slice(
        0,
        GOAL_SYNC_RESOLVE_CAP,
      );
      // Recall found nobody. That is a FINISHED pass that matched nobody — the
      // common outcome for an abstract objective on hosted, where hybridSearch
      // has no semantic stage — so it is stamped here, in the scope already
      // open, rather than left looking like a pass that never ran.
      if (candidates.length === 0) {
        await recordGoalMatchRun(goalId, []);
        return null;
      }
      const context = await loadGoalSubjectContext(candidates);
      const today = await userToday();
      return { candidates, context, today };
    });
    if (!prepared) return { matched: 0, skipped: "no_candidates" };

    // NO CONNECTION IS HELD HERE. Concurrent because the whole point is that
    // the user is waiting: bounded by GOAL_SYNC_RESOLVE_CAP, so the fan-out is
    // a contract, not a side effect of how many hits recall happened to return.
    const judged = await Promise.all(
      prepared.candidates.map((candidate) => {
        const subject = prepared.context.get(candidate.contactId);
        // Recalled row vanished between the two reads — nothing to judge on.
        if (!subject) return null;
        return judgeCandidate(objective, candidate, subject, prepared.today);
      }),
    );
    const completed = judged.filter((item): item is GoalJudgement => item !== null);
    // EVERY call failed: not a pass that matched nobody. Stamping it would tell
    // the user their graph has no one for this goal when we never got a verdict.
    if (completed.length === 0) return { matched: 0, skipped: "failed" };

    // Scope 2: metering and the member write, after the model, in one short
    // scope. Sequential — never Promise.all (3-connection tenant pool).
    const accepted = completed
      .map((item) => item.verdict)
      .filter((verdict): verdict is GoalMatchVerdict => verdict !== null);
    const matched = await withUserDb(userId, async () => {
      for (const item of completed) {
        try {
          await recordAiAction("goal_match_now", item.model, item.usage);
        } catch {
          // One call failing to meter must never drop the cohort it produced.
        }
      }
      return recordGoalMatchRun(goalId, accepted);
    });
    return { matched, skipped: null };
  } catch (error) {
    if (error instanceof AiBudgetError) return { matched: 0, skipped: "no_budget" };
    // PII-safe: class / code / status only, never the objective or a contact.
    console.error("[goal-resolve] resolve failed", {
      name: error instanceof Error ? error.name : typeof error,
      code: (error as { code?: unknown } | null)?.code,
      status: (error as { status?: unknown } | null)?.status,
    });
    return { matched: 0, skipped: "failed" };
  }
}
