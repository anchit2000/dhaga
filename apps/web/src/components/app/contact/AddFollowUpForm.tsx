"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { RecurrenceFields } from "@/components/app/tasks/RecurrenceFields";
import { SubmitButton } from "../SubmitButton";

/** Add a follow-up by hand — no note, no extraction. The typed action and the
 *  picked date go up to the host (FollowUpList), which shows it optimistically
 *  and runs the write. The "when" is a real Date (stored as a machine
 *  timestamp; the LLM's free-text `dueHint` prose is a separate path). */
export function AddFollowUpForm({
  onAdd,
}: {
  onAdd: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const action = String(data.get("action") ?? "").trim();
    if (!action) return;
    if (data.get("recurrenceFrequency") && !dueDate) {
      toast.error("Choose a due date for a repeating follow-up.");
      return;
    }
    onAdd(data);
    form.reset();
    setDueDate(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-seam px-3 py-2 text-xs text-fog transition-colors hover:border-amber/40 hover:text-paper"
      >
        <Plus className="size-3.5" />
        Add follow-up
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-seam bg-panel p-3"
    >
      <Input name="action" required autoFocus placeholder="What to do" className="min-h-11 text-sm" />
      <DatePicker
        name="dueDate"
        submissionMode="date"
        value={dueDate}
        onChange={setDueDate}
        placeholder="When — optional"
      />
      <RecurrenceFields initial={null} />
      <div className="flex items-center gap-2">
        <SubmitButton className="min-h-11">Add</SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 px-3 text-xs text-fog transition-colors hover:text-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
