"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

/** The two shapes a goal actually takes, in the user's own words — a cohort you
 *  can name ("VCs") and a cohort you can only point at ("the Delhi trip"). */
const PLACEHOLDER = "reach out to VCs\nreconnect with people from the Delhi trip";

/**
 * Write or reword the one goal. Body is mounted only while open, so it reads the
 * current objective into local state on every open — no reset effect (same idiom
 * as CompanyFormDialog).
 *
 * Saving is a plain DB write: free, instant, no model call and so no outcome to
 * report back. Matching happens in the nightly pass, or on the strip's "Request
 * now" — see lib/actions/goals.ts.
 */
export function GoalDialog({
  open,
  objective,
  onOpenChange,
}: {
  open: boolean;
  /** Empty string = no goal yet, which puts the dialog in "set" mode. */
  objective: string;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <GoalDialogBody objective={objective} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GoalDialogBody({
  objective,
  onClose,
}: {
  objective: string;
  onClose: () => void;
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
    startTransition(async () => {
      const formData = new FormData();
      formData.set("objective", trimmed);
      const result = await saveGoalAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
      // Deliberately NOT "Dhaga is finding people who fit": nothing has been
      // matched yet. WHEN people arrive is the strip's job to say, in place.
      toastSuccess(isEdit ? "Goal updated." : "Goal set.");
    });
  }

  return (
    <>
      <DialogTitle>{isEdit ? "Edit goal" : "Set a goal"}</DialogTitle>
      <DialogDescription>
        Say what you&apos;re trying to do, in your own words. Tonight&apos;s pass finds the
        people in your graph who fit, and Today surfaces a few each day until the list is
        done.
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
