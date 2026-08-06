"use client";

import { useState } from "react";
import { runAction } from "@/components/app/ActionForm";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { RecurrenceFields } from "@/components/app/tasks/RecurrenceFields";
import { updateTaskAction } from "@/lib/actions/tasks";
import { SaveButton } from "./SaveButton";
import type { RecurrenceRule } from "@dhaga/core/src/dates";

/**
 * Edit one follow-up in place: action text, due date, and recurrence.
 *
 * Laid out as two stacked blocks rather than one wrapping flex row. A
 * `basis-full` recurrence block sharing a non-wrapping row starves the
 * `flex-1` action input of free space — with `flex-basis: 0` and `min-w-0` it
 * can neither grow nor shrink, so it collapsed to its own padding.
 */
export function FollowUpEditForm({
  followUpId,
  contactId,
  action,
  initialDueDate,
  recurrence,
  onDone,
}: {
  followUpId: string;
  contactId: string;
  action: string;
  initialDueDate: Date | null;
  recurrence: RecurrenceRule | null;
  onDone: () => void;
}) {
  const [dueDate, setDueDate] = useState<Date | null>(initialDueDate);

  return (
    <form
      action={async (formData) => {
        // Keep the row in edit mode (action + date intact) if the save
        // throws — a transient failure toasts, never the full-page boundary.
        const ok = await runAction(async () => {
          const result = await updateTaskAction(formData);
          if (!result.ok) throw new Error(result.error);
        }, "Couldn't save the follow-up — try again.");
        if (ok) onDone();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="followUpId" value={followUpId} />
      <input type="hidden" name="taskId" value={followUpId} />
      <input type="hidden" name="contactId" value={contactId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          name="action"
          defaultValue={action}
          required
          autoFocus
          className="min-h-11 flex-1 text-sm"
        />
        <div className="sm:w-44">
          <DatePicker
            name="dueDate"
            submissionMode="date"
            value={dueDate}
            onChange={setDueDate}
            placeholder="When — optional"
          />
        </div>
        <div className="flex items-center gap-2">
          <SaveButton label="Save follow-up" />
          <button
            type="button"
            onClick={onDone}
            className="min-h-11 px-3 text-xs text-fog transition-colors hover:text-paper"
          >
            Cancel
          </button>
        </div>
      </div>
      <RecurrenceFields initial={recurrence} />
    </form>
  );
}
