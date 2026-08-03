import { hasLLM } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { RateLimitError, enforceRateLimit } from "@/lib/ratelimit";
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
 * Resolve a goal's cohort NOW, on the save that created or reworded it.
 *
 * Why synchronous: matching used to happen only in the nightly cron, so stating
 * a goal did nothing for up to 24 hours — and nothing at all on a deployment
 * with no cron. The strip sat on "Finding people" and users read it as a hang.
 * Batch is 50% cheaper but takes minutes to hours, which IS the bug, so this
 * path uses plain `extract` (Haiku) and the Batch pass stays for the nightly
 * top-up.
 *
 * THE POOL HAZARD is the thing to preserve when editing this file. The tenant
 * pool caps at 3 connections and a connection held across an LLM call took out
 * /app in production (PR #92). So the shape is: acquire → read → RELEASE → call
 * the model → re-acquire → write. Each `withUserDb` below is one short scope,
 * and the model calls sit BETWEEN them, never inside one. ./judge.ts cannot
 * open a connection at all, which is what keeps that true by construction.
 *
 * Cost: metered as `goal_matching` (priced 0 credits, like the nightly pass —
 * the user is not billed for stating a goal), so the monthly credit cap does
 * NOT bound it. The `goal_resolve` rate-limit bucket is therefore the real
 * fuse: 3 resolves per user per day, see utils/constants/ratelimit.ts.
 */

export type GoalResolveSkip =
  | "no_llm"
  | "rate_limited"
  | "no_budget"
  | "no_candidates"
  | "failed";

export interface GoalResolveOutcome {
  matched: number;
  skipped: GoalResolveSkip | null;
}

/** One resolve = one metered action, however many contacts it judges. */
export function resolveGoalNow(
  userId: string,
  goalId: string,
  objective: string,
): Promise<GoalResolveOutcome> {
  return withAiAction("goal_matching", () => runGoalResolve(userId, goalId, objective));
}

async function runGoalResolve(
  userId: string,
  goalId: string,
  objective: string,
): Promise<GoalResolveOutcome> {
  if (!hasLLM()) return { matched: 0, skipped: "no_llm" };
  // The cheapest fuse first, and before any connection is taken: the in-memory
  // limiter needs no DB (same ordering assertAiBudget uses for its burst guard).
  try {
    await enforceRateLimit(userId, "goal_resolve");
  } catch (error) {
    if (error instanceof RateLimitError) return { matched: 0, skipped: "rate_limited" };
    throw error;
  }

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
          await recordAiAction("goal_matching", item.model, item.usage);
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
