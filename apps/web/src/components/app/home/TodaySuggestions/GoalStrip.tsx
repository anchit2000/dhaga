"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, MoreHorizontal, Pencil, Target } from "lucide-react";
import { GoalDialog } from "./GoalDialog";
import { GoalRequestDialog } from "./GoalRequestDialog";
import { GoalStatus, type GoalRequestState } from "./GoalStatus";
import { toastError, toastSuccess } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  archiveGoalAction,
  markGoalDoneAction,
  requestGoalMatchAction,
} from "@/lib/actions/goals";
import type { ReactElement } from "react";
import type { MutationResult } from "@/lib/actions/mutation";
import type { GoalProgress } from "@/lib/repo/goals";

/**
 * The goal line at the top of Today: what the user said they're trying to do,
 * how far the cohort has burned down, and the three ways it ends.
 *
 * It lives INSIDE the Today tile rather than on a route of its own: a goal has
 * one consumer (this list) and one state worth reading (how many are left), so
 * /app/goals would be an empty page for every user without a goal and a
 * duplicate of this strip for everyone else.
 *
 * The burn-down is derived, never stored (lib/repo/goals/cohort.ts) — so the bar
 * moves the moment the user marks someone reached out.
 *
 * What the strip SAYS about matching lives in ./GoalStatus, which is where the
 * "Finding people forever" bug was. This component owns the outcome of a
 * REQUESTED match only because it outlives the dialog that asked for it: the
 * confirmation unmounts the moment the user confirms, and the reason a request
 * matched nobody has to survive that.
 */
export function GoalStrip({ progress }: { progress: GoalProgress | null }): ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [request, setRequest] = useState<GoalRequestState | null>(null);
  const [pending, startTransition] = useTransition();

  function resolve(run: () => Promise<MutationResult<null>>, done: string): void {
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      router.refresh();
      toastSuccess(done);
    });
  }

  /** The paid match. Closes the confirmation first so the strip — not a modal —
   *  carries the in-flight state, and clears it again if the ACTION itself
   *  failed, since then nothing ran and nothing is pending. */
  function requestMatch(): void {
    setConfirming(false);
    setRequest({ phase: "running" });
    startTransition(async () => {
      const result = await requestGoalMatchAction();
      if (!result.ok) {
        setRequest(null);
        toastError(result.error);
        return;
      }
      setRequest({ phase: "settled", skip: result.data });
      router.refresh();
    });
  }

  /** Re-opening the dialog drops the last outcome: the objective is about to
   *  change, and a stale "nobody matched" under new words is misleading. */
  function openDialog(): void {
    setRequest(null);
    setEditing(true);
  }

  // No margin on the wrapper: HomeTile lays its children out in a gap-3 column.
  return (
    <div>
      {progress === null ? (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-11 gap-1.5 px-2 font-normal normal-case text-fog hover:text-paper"
          onClick={openDialog}
        >
          <Target /> Set a goal
        </Button>
      ) : (
        <div className="rounded-xl bg-amber/[0.06] px-3 py-2.5">
          <div className="flex items-start gap-2">
            {/* The objective is user free text: a TEXT NODE only, never an
                attribute (no title=, no aria-label=). `truncate` needs the
                min-w-0 to shrink inside the flex row at 375px. */}
            <p className="min-w-0 flex-1 truncate text-sm text-paper">{progress.objective}</p>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    // 44px hit target, pulled back into the strip's own padding
                    // so the touch area doesn't inflate the line height.
                    className="-my-2 -mr-2 size-11 shrink-0 text-fog hover:text-paper"
                    loading={pending}
                  />
                }
              >
                <MoreHorizontal />
                <span className="sr-only">Goal actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openDialog}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => resolve(markGoalDoneAction, "Goal marked done.")}>
                  <Check />
                  Mark done
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => resolve(archiveGoalAction, "Goal archived.")}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-2" aria-live="polite">
            <GoalStatus progress={progress} request={request} onEdit={openDialog} onRequest={() => setConfirming(true)} />
          </div>
        </div>
      )}
      <GoalDialog open={editing} objective={progress?.objective ?? ""} onOpenChange={setEditing} />
      <GoalRequestDialog open={confirming} onOpenChange={setConfirming} onConfirm={requestMatch} />
    </div>
  );
}
