"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { recurrenceRuleFromFields } from "@dhaga/core/src/dates";
import {
  completeFollowUpAction,
  dismissFollowUpAction,
} from "@/lib/actions/follow-ups";
import { formatDueDate } from "@/utils/format-date";
import { DeleteButton } from "./DeleteButton";
import { FollowUpEditForm } from "./FollowUpEditForm";
import type { FollowUpRow } from "@/lib/db/schema";

/**
 * One follow-up row: complete it, edit it in place (action text + due date), or
 * dismiss it. Mirrors FactItem's edit/delete UX; "delete" soft-dismisses
 * (status='dismissed') so the row leaves every open list with no schema change.
 */
export function FollowUpItem({
  contactId,
  followUp,
}: {
  contactId: string;
  followUp: FollowUpRow;
}) {
  const [editing, setEditing] = useState(false);
  const recurrence = recurrenceRuleFromFields({
    frequency: followUp.recurrenceFrequency,
    interval: followUp.recurrenceInterval,
    weekday: followUp.recurrenceWeekday,
    monthDay: followUp.recurrenceMonthDay,
    month: followUp.recurrenceMonth,
  });

  if (editing) {
    return (
      <li className="rounded-lg border border-seam bg-panel px-3 py-2">
        <FollowUpEditForm
          followUpId={followUp.id}
          contactId={contactId}
          action={followUp.action}
          initialDueDate={followUp.dueDate}
          recurrence={recurrence}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-seam bg-panel px-3 py-2">
      <ActionForm
        action={completeFollowUpAction}
        errorMessage="Couldn't complete the follow-up — try again."
        className="shrink-0"
      >
        <input type="hidden" name="followUpId" value={followUp.id} />
        <input type="hidden" name="contactId" value={contactId} />
        <input type="hidden" name="expectedDueDate" value={followUp.dueDate?.toISOString() ?? ""} />
        <button
          type="submit"
          aria-label="Mark done"
          title="Mark done"
          className="flex size-11 items-center justify-center rounded-full border border-amber/50 text-ember transition-colors hover:bg-amber/15"
        >
          <Check className="size-3" />
        </button>
      </ActionForm>
      <p className="min-w-0 flex-1 text-sm text-paper">
        {followUp.action}
        {followUp.dueDate ? (
          <span className="text-fog"> — {formatDueDate(followUp.dueDate)}</span>
        ) : followUp.dueHint ? (
          <span className="text-fog"> — {followUp.dueHint}</span>
        ) : null}
      </p>
      <button
        type="button"
        aria-label="Edit follow-up"
        title="Edit follow-up"
        onClick={() => setEditing(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-fog transition-colors hover:bg-wash/[0.06] hover:text-paper"
      >
        <Pencil className="size-3.5" />
      </button>
      <ActionForm
        action={dismissFollowUpAction}
        errorMessage="Couldn't delete that follow-up."
        className="shrink-0"
      >
        <input type="hidden" name="followUpId" value={followUp.id} />
        <input type="hidden" name="contactId" value={contactId} />
        <DeleteButton label="Delete follow-up" />
      </ActionForm>
    </li>
  );
}
