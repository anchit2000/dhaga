"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FormError, toastSuccess } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveGoalAction } from "@/lib/actions/goals";
import { GOAL_OBJECTIVE_MAX_CHARS } from "@/utils/constants/goals";
import type { ReactElement } from "react";
import type { GoalSaveState } from "./GoalStatus";

/** The two shapes a goal actually takes, in the user's own words — a cohort you
 *  can name ("VCs") and a cohort you can only point at ("the Delhi trip"). */
const PLACEHOLDER = "reach out to VCs\nreconnect with people from the Delhi trip";

/** Saving now runs a real match against the graph before it returns, so the
 *  wait needs a reason on screen — a spinner alone reads as a stall. */
const PENDING_LINE = "Reading your graph and matching people — a few seconds.";

/**
 * Write or reword the one goal. Body is mounted only while open, so it reads the
 * current objective into local state on every open — no reset effect (same idiom
 * as CompanyFormDialog).
 */
export function GoalDialog({
  open,
  objective,
  onOpenChange,
  onSaveState,
}: {
  open: boolean;
  /** Empty string = no goal yet, which puts the dialog in "set" mode. */
  objective: string;
  onOpenChange: (open: boolean) => void;
  /** Reported up to the strip, which outlives this dialog: it renders the
   *  in-flight line while the save runs and the outcome after it closes. */
  onSaveState: (state: GoalSaveState) => void;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <GoalDialogBody
            objective={objective}
            onClose={() => onOpenChange(false)}
            onSaveState={onSaveState}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GoalDialogBody({
  objective,
  onClose,
  onSaveState,
}: {
  objective: string;
  onClose: () => void;
  onSaveState: (state: GoalSaveState) => void;
}): ReactElement {
  const router = useRouter();
  const [text, setText] = useState(objective);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const trimmed = text.trim();
  const isEdit = objective.length > 0;

  function submit(): void {
    if (!trimmed) return;
    setError(null);
    onSaveState({ phase: "saving" });
    startTransition(async () => {
      const formData = new FormData();
      formData.set("objective", trimmed);
      const result = await saveGoalAction(formData);
      if (!result.ok) {
        // The write failed, so nothing was matched and nothing is pending:
        // clear the strip's in-flight line rather than leave it spinning.
        onSaveState({ phase: "settled", skip: null });
        setError(result.error);
        return;
      }
      // The resolve's skip reason rides back on the action's payload. `null`
      // means it matched (or that the reword was a no-op), and the strip falls
      // through to the burn-down it reads off GoalProgress.
      onSaveState({ phase: "settled", skip: result.data });
      onClose();
      router.refresh();
      // Deliberately NOT "Dhaga is finding people who fit": the match already
      // ran by the time this fires, and it may well have found nobody. What it
      // did is the strip's job to say, honestly, in place.
      toastSuccess(isEdit ? "Goal updated." : "Goal set.");
    });
  }

  return (
    <>
      <DialogTitle>{isEdit ? "Edit goal" : "Set a goal"}</DialogTitle>
      <DialogDescription>
        Say what you&apos;re trying to do, in your own words. Dhaga finds the people in your
        graph who fit and surfaces a few each day until the list is done.
      </DialogDescription>
      <div className="space-y-1.5">
        <Label htmlFor="goal-objective" className="text-fog">
          Goal
        </Label>
        <Textarea
          id="goal-objective"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={GOAL_OBJECTIVE_MAX_CHARS}
          rows={3}
          placeholder={PLACEHOLDER}
          disabled={pending}
        />
        <p className="text-right font-mono text-[10px] tracking-widest text-fog">
          {text.length}/{GOAL_OBJECTIVE_MAX_CHARS}
        </p>
        {error ? <FormError message={error} /> : null}
        {pending ? (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-fog">
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-ember" />
            <span className="min-w-0 flex-1">{PENDING_LINE}</span>
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button className="min-h-11" onClick={submit} loading={pending} disabled={!trimmed}>
          {isEdit ? "Save goal" : "Set goal"}
        </Button>
      </DialogFooter>
    </>
  );
}
