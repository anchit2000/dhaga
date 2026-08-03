"use client";

import { Clock, Loader2, Search, Sparkles, TriangleAlert } from "lucide-react";
import { EditGoalButton, GoalProgressBar, Note, RequestNowButton } from "./GoalStatusParts";
import {
  GOAL_MATCHING_LINE,
  GOAL_NIGHTLY_LINE,
  GOAL_NO_MATCH_HINT,
  GOAL_NO_MATCH_LINE,
  GOAL_NO_MATCH_TOPUP,
  GOAL_QUEUED_LINE,
  GOAL_REQUEST_NOTICE,
  GOAL_TOPUP_LINE,
} from "./labels";
import type { ReactElement } from "react";
import type { GoalResolveSkip } from "@/lib/ai/goal-resolve";
import type { GoalProgress } from "@/lib/repo/goals";

/**
 * The one line under the objective that says what matching actually did.
 *
 * The bug this replaces: an empty cohort rendered as "Finding people" whether a
 * match pass had run or not, so a goal nobody matched looked identical to a goal
 * still being worked on — indefinitely. Every branch below is derived from data
 * already on screen (GoalProgress) or from the outcome of a match the user
 * REQUESTED; nothing here polls, and the only spinner is tied to a request in
 * flight. Saving a goal produces no outcome at all now — it runs no model — so
 * the waiting state is a plain statement of when people arrive, not a spinner.
 */

/** What the "Request now" run in THIS session did. `running` is the request in
 *  flight; `settled` carries its skip reason (null = it matched). */
export type GoalRequestState =
  | { phase: "running" }
  | { phase: "settled"; skip: GoalResolveSkip | null };

export function GoalStatus({
  progress,
  request,
  onEdit,
  onRequest,
}: {
  progress: GoalProgress;
  /** null until this session requests a match; takes precedence over
   *  `progress`, which is a render behind until the router refresh lands. */
  request: GoalRequestState | null;
  onEdit: () => void;
  onRequest: () => void;
}): ReactElement {
  if (request?.phase === "running") {
    return (
      <Note icon={<Loader2 className="size-3.5 animate-spin text-ember" />}>
        {GOAL_MATCHING_LINE}
      </Note>
    );
  }
  const skip = request?.phase === "settled" ? request.skip : null;
  const notice =
    skip && skip !== "no_candidates" ? (
      <Note
        destructive={skip === "failed"}
        icon={
          skip === "failed" ? (
            <TriangleAlert className="size-3.5" />
          ) : (
            <Sparkles className="size-3.5 text-ember" />
          )
        }
      >
        {GOAL_REQUEST_NOTICE[skip]}
      </Note>
    ) : null;

  // Members to work through: the burn-down is the headline and a failed request
  // is a footnote under it, never a replacement — the cohort on screen is still
  // real work even if this particular request failed to add to it.
  if (progress.state === "matched") {
    return (
      <div className="space-y-2">
        <GoalProgressBar done={progress.done} total={progress.total} />
        {notice}
        {!notice && progress.topUpPending ? (
          <Note icon={<Sparkles className="size-3.5 text-ember" />}>{GOAL_TOPUP_LINE}</Note>
        ) : null}
      </div>
    );
  }

  // A pass finished and accepted nobody. No "Request now" here on purpose:
  // re-judging the same words against the same graph costs credits to reach the
  // same verdict, so the affordance that can actually change it is the reword.
  if (progress.state === "no_matches" || skip === "no_candidates") {
    return (
      <div>
        {notice}
        <Note icon={<Search className="size-3.5" />}>
          {GOAL_NO_MATCH_LINE} {GOAL_NO_MATCH_HINT}
          {progress.topUpPending ? ` ${GOAL_NO_MATCH_TOPUP}` : ""}
        </Note>
        <EditGoalButton onEdit={onEdit} />
      </div>
    );
  }

  // Nothing has matched yet — the state every goal starts in. Waiting is free
  // and is what happens by default; the button is the paid way to skip ahead,
  // and it stays offered under a failed request so it doubles as the retry.
  return (
    <div>
      {notice ?? (
        <Note icon={<Clock className="size-3.5" />}>
          {progress.topUpPending ? GOAL_QUEUED_LINE : GOAL_NIGHTLY_LINE}
        </Note>
      )}
      <RequestNowButton onRequest={onRequest} />
    </div>
  );
}
