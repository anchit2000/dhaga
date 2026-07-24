"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createFollowUpAction } from "@/lib/actions/manual-entries";
import type { NoteFormState } from "@/lib/actions/notes";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SubmitButton } from "../SubmitButton";

/** Add a follow-up by hand — no note, no extraction. The "when" is a real date
 *  from the date picker, submitted via its hidden `dueDate` input and stored as
 *  a machine timestamp (the LLM's free-text `dueHint` prose is a separate path). */
export function AddFollowUpForm({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    async (previous, formData) => {
      const result = await createFollowUpAction(previous, formData);
      if (!result.error) {
        formRef.current?.reset();
        setDueDate(null);
      }
      return result;
    },
    {},
  );

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
      ref={formRef}
      action={formAction}
      className="space-y-2 rounded-lg border border-seam bg-panel p-3"
    >
      <input type="hidden" name="contactId" value={contactId} />
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
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
