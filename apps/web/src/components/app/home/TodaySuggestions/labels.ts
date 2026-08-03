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

/** A REQUESTED match is in flight. The ONLY copy here that comes with a
 *  spinner, and it is bounded by the action's own transition — it cannot
 *  outlive the request. Saving a goal never shows this: the save runs no model. */
export const GOAL_MATCHING_LINE = "Matching people in your graph to this goal…";

/** A pass finished and accepted nobody. Not a failure: recall is keyword-driven
 *  (hosted `hybridSearch` has no semantic stage), so an abstract objective
 *  genuinely matches no one — which is why the hint is about wording. */
export const GOAL_NO_MATCH_LINE = "No one in your graph matched this goal.";
export const GOAL_NO_MATCH_HINT =
  "Matching goes on the words you use, so naming a role, company or place — founders in Bangalore, ex-colleagues at Stripe — finds people that an abstract phrase misses.";
export const GOAL_NO_MATCH_TOPUP = "Tonight's pass will look again.";

/**
 * No pass has finished yet — the normal, healthy state of a goal that was just
 * saved. Waiting is the DEFAULT now (saving costs nothing and calls no model),
 * so these say when people arrive rather than pretending to be busy.
 *
 * Two lines because the two waits are genuinely different lengths, and rounding
 * the longer one down to "tomorrow" would be the same kind of lie the old
 * "Finding people" was: `topUpPending` means last night's batch is in flight and
 * tonight's pass applies it, so people land tomorrow. With no batch in flight,
 * tonight's pass only SUBMITS one and the night after applies it.
 */
export const GOAL_QUEUED_LINE =
  "Tonight's matching pass has this goal queued — the people who fit will be here tomorrow.";
export const GOAL_NIGHTLY_LINE =
  "Matching runs in the nightly pass, so the people who fit will start showing up here tomorrow.";

/** There are members to work through, and a nightly Batch pass may add more. */
export const GOAL_TOPUP_LINE = "Tonight's pass may add more people.";

/**
 * Why a REQUESTED match fell short. `no_candidates` is deliberately absent: it
 * IS a finished pass that matched nobody, so it renders as GOAL_NO_MATCH_*
 * rather than as its own excuse — the Exclude keeps that decision typed.
 *
 * None of them mentions the goal being saved: the goal was saved separately,
 * for free, and only this paid request fell over. Each says whether the credits
 * were spent, because that is the question a priced action raises.
 */
export const GOAL_REQUEST_NOTICE: Record<Exclude<GoalResolveSkip, "no_candidates">, string> = {
  no_llm:
    "This instance has no AI provider configured, so nothing was matched and nothing was charged — add an API key in Settings to match on demand.",
  no_budget:
    "You are out of AI credits this month, so the match did not run and nothing was charged. Tonight's pass still runs, free.",
  failed:
    "Matching did not finish — something went wrong on our end. Try again, or leave it to tonight's free pass.",
};

/** The confirmation before spending credits. Both numbers, in the order that
 *  makes waiting the obvious default: what it costs now, and that it is free
 *  tomorrow. The count is a NUMBER, never the raw feature id. */
export function goalRequestCostLine(credits: number): string {
  return `Matching now costs ${credits} AI ${credits === 1 ? "credit" : "credits"} and takes a few seconds.`;
}
export const GOAL_REQUEST_FREE_LINE =
  "Waiting for tonight's pass costs nothing — it matches this goal for free while you sleep.";
