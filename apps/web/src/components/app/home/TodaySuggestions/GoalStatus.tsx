"use client";

import { Clock, Loader2, Search, Sparkles, TriangleAlert } from "lucide-react";
import { EditGoalButton, GoalProgressBar, Note } from "./GoalStatusParts";
import {
  GOAL_MATCHING_LINE,
  GOAL_NO_MATCH_HINT,
  GOAL_NO_MATCH_LINE,
  GOAL_NO_MATCH_TOPUP,
  GOAL_QUEUED_LINE,
  GOAL_SAVE_NOTICE,
  GOAL_TOPUP_LINE,
  GOAL_UNRESOLVED_LINE,
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
 * already on screen (GoalProgress) or from the outcome the save just returned;
 * nothing here polls, and the only spinner is tied to a request in flight.
 */

/** What the last save in THIS session did. `saving` is the request being in
 *  flight; `settled` carries the resolve's skip reason (null = it matched). */
export type GoalSaveState =
  | { phase: "saving" }
  | { phase: "settled"; skip: GoalResolveSkip | null };

export function GoalStatus({
  progress,
  save,
  onEdit,
}: {
  progress: GoalProgress;
  /** null until this session saves; takes precedence over `progress`, which is
   *  a render behind until the router refresh that follows the save lands. */
  save: GoalSaveState | null;
  onEdit: () => void;
}): ReactElement {
  if (save?.phase === "saving") {
    return (
      <Note icon={<Loader2 className="size-3.5 animate-spin text-ember" />}>
        {GOAL_MATCHING_LINE}
      </Note>
    );
  }
  const skip = save?.phase === "settled" ? save.skip : null;
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
        {GOAL_SAVE_NOTICE[skip]}
      </Note>
    ) : null;

  // Members to work through: the burn-down is the headline and a save-time skip
  // is a footnote under it, never a replacement — the cohort on screen is still
  // real work even if this particular reword failed to add to it.
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

  // Nothing to work through, and the skip is the reason why.
  if (notice) return notice;

  if (progress.state === "no_matches" || skip === "no_candidates") {
    return (
      <div>
        <Note icon={<Search className="size-3.5" />}>
          {GOAL_NO_MATCH_LINE} {GOAL_NO_MATCH_HINT}
          {progress.topUpPending ? ` ${GOAL_NO_MATCH_TOPUP}` : ""}
        </Note>
        <EditGoalButton onEdit={onEdit} />
      </div>
    );
  }

  // Unresolved: legitimate only before any pass has finished. Say which of the
  // two it is — a queued batch, or nothing scheduled and it needs a re-save.
  if (progress.topUpPending) {
    return <Note icon={<Clock className="size-3.5" />}>{GOAL_QUEUED_LINE}</Note>;
  }
  return (
    <div>
      <Note icon={<Clock className="size-3.5" />}>{GOAL_UNRESOLVED_LINE}</Note>
      <EditGoalButton onEdit={onEdit} />
    </div>
  );
}
