"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SubmitButton } from "../SubmitButton";

/** Add a follow-up by hand — no note, no extraction. The typed action and the
 *  picked date go up to the host (FollowUpList), which shows it optimistically
 *  and runs the write. The "when" is a real Date (stored as a machine
 *  timestamp; the LLM's free-text `dueHint` prose is a separate path). */
export function AddFollowUpForm({
  onAdd,
}: {
  onAdd: (action: string, dueDate: Date | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const action = String(new FormData(form).get("action") ?? "").trim();
    if (!action) return;
    onAdd(action, dueDate);
    form.reset();
    setDueDate(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-seam px-3 py-2 text-xs text-fog transition-colors hover:border-amber/40 hover:text-paper"
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
      <Input name="action" required autoFocus placeholder="What to do" className="text-sm" />
      <DatePicker
        name="dueDate"
        value={dueDate}
        onChange={setDueDate}
        placeholder="When — optional"
      />
      <div className="flex items-center gap-2">
        <SubmitButton className="h-8">Add</SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-fog transition-colors hover:text-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
