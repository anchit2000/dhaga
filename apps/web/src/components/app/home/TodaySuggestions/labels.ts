import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { GoalResolveSkip } from "@/lib/ai/goal-resolve";

/**
 * The short mono tag that prefixes a row's reason. Keyed off the bucket union, so
 * a new SuggestionBucket cannot ship without a name for it — that is the point of
 * the Record: TypeScript fails the build rather than rendering `undefined ·`.
 */
export const BUCKET_LABEL: Record<DailySuggestion["bucket"], string> = {
  daily: "Check-in",
  cadence: "Due",
  "follow-up": "Follow-up",
  date: "Occasion",
  goal: "Goal",
  signal: "Signal",
  quiet: "Quiet",
  graph: "Network",
};

/**
 * Every sentence the goal strip can say about matching, in one place.
 *
 * The strip used to have exactly one line for an empty cohort — "Finding
 * people" — which it showed forever, whether a pass had run or not. These
 * strings exist so each distinguishable outcome gets its own honest sentence:
 * none of them may imply work is in progress unless it demonstrably is.
 */

/** A save is in flight. The ONLY copy here that comes with a spinner, and it is
 *  bounded by the action's own transition — it cannot outlive the request. */
export const GOAL_MATCHING_LINE = "Matching people in your graph to this goal…";

/** A pass finished and accepted nobody. Not a failure: recall is keyword-driven
 *  (hosted `hybridSearch` has no semantic stage), so an abstract objective
 *  genuinely matches no one — which is why the hint is about wording. */
export const GOAL_NO_MATCH_LINE = "No one in your graph matched this goal.";
export const GOAL_NO_MATCH_HINT =
  "Matching goes on the words you use, so naming a role, company or place — founders in Bangalore, ex-colleagues at Stripe — finds people that an abstract phrase misses.";
export const GOAL_NO_MATCH_TOPUP = "Tonight's pass will look again.";

/** No pass has finished yet. `topUpPending` says whether one is actually
 *  queued — without it, nothing is coming and saying so is the whole point. */
export const GOAL_QUEUED_LINE = "Queued for tonight's matching pass.";
export const GOAL_UNRESOLVED_LINE = "No matching has run for this goal yet.";

/** There are members to work through, and a nightly Batch pass may add more. */
export const GOAL_TOPUP_LINE = "Tonight's pass may add more people.";

/**
 * Why the resolve on save fell short. `no_candidates` is deliberately absent:
 * it IS a finished pass that matched nobody, so it renders as GOAL_NO_MATCH_*
 * rather than as its own excuse — the Exclude keeps that decision typed.
 *
 * Each one opens with "Goal saved" because the save DID succeed; only matching
 * was skipped, and a notice that reads like a failure would suggest otherwise.
 */
export const GOAL_SAVE_NOTICE: Record<Exclude<GoalResolveSkip, "no_candidates">, string> = {
  no_llm:
    "Goal saved. This instance has no AI provider configured, so no one was matched — add an API key in Settings, then save the goal again.",
  rate_limited:
    "Goal saved. Matching runs at most 3 times a day and today's are used up — tonight's pass will pick this up, or reword the goal tomorrow.",
  no_budget:
    "Goal saved. You are out of AI credits this month, so matching did not run — it resumes when your allowance renews.",
  failed:
    "Goal saved, but matching did not finish — something went wrong on our end. Save the goal again to retry.",
};
