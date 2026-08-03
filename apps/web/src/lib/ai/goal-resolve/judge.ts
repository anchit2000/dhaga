import {
  GOAL_MATCHING_SYSTEM,
  buildGoalMatchingPrompt,
  getLLMClient,
  goalMatchSchema,
} from "@dhaga/core";
import type { CalendarDay, LLMUsage } from "@dhaga/core";
import type { GoalMatchVerdict, GoalRecallCandidate, GoalSubjectContext } from "@/lib/repo/goals";

/**
 * ONE contact judged against the objective, synchronously.
 *
 * Reuses the nightly pass's prompt verbatim — GOAL_MATCHING_SYSTEM,
 * buildGoalMatchingPrompt, goalMatchSchema — because the two passes must reach
 * the same verdict about the same person; a second prompt would mean the cohort
 * you get on save differs from the cohort you get overnight, with nothing to
 * explain the difference. Tier "extract" (Haiku): this is a classification, not
 * reasoning prose.
 *
 * NO DATABASE HERE, deliberately. This function is called after the caller has
 * released its scoped connection and before it re-acquires one — holding a
 * tenant connection across a model round-trip is the pool-exhaustion outage of
 * PR #92 (the pool caps at 3), so the LLM call site is kept in a module that
 * has no way to open one.
 */

export interface GoalJudgement {
  /** Null when the model said "not a match" — the call still happened and is
   *  still metered, which is why this is not simply omitted. */
  verdict: GoalMatchVerdict | null;
  model: string;
  usage: LLMUsage;
}

/** Null means the CALL failed (API error, schema mismatch). Distinct from a
 *  successful "not a match": the caller must not treat a run whose calls all
 *  failed as a finished pass that matched nobody. */
export async function judgeCandidate(
  objective: string,
  candidate: GoalRecallCandidate,
  subject: GoalSubjectContext,
  today: CalendarDay,
): Promise<GoalJudgement | null> {
  try {
    const result = await getLLMClient().extract({
      schema: goalMatchSchema,
      system: GOAL_MATCHING_SYSTEM,
      // The objective goes in VERBATIM — the user's phrasing is the whole
      // specification. Per-contact context caps are applied inside the builder.
      prompt: buildGoalMatchingPrompt(
        objective,
        {
          name: candidate.name,
          title: candidate.title,
          company: candidate.companyName,
          ...subject,
        },
        today,
      ),
      tier: "extract",
    });
    return {
      verdict: result.data.matches
        ? { contactId: candidate.contactId, fit: result.data.fit }
        : null,
      model: result.model,
      usage: result.usage,
    };
  } catch (error) {
    // PII-safe: error class / code / HTTP status only, never the message body
    // or the contact — the prompt carries notes and facts about a third party
    // (privacy rule; mirrors the [card-scan] failure log).
    console.error("[goal-resolve] candidate judgement failed", {
      name: error instanceof Error ? error.name : typeof error,
      code: (error as { code?: unknown } | null)?.code,
      status: (error as { status?: unknown } | null)?.status,
    });
    return null;
  }
}
