"use client";

import { useActionState, useRef } from "react";
import { addNoteAction, type NoteFormState } from "@/lib/actions/notes";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "../SubmitButton";

export function AddNoteForm({ contactId }: { contactId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    async (previous, formData) => {
      const result = await addNoteAction(previous, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="contactId" value={contactId} />
      <Textarea
        name="body"
        required
        rows={3}
        placeholder="What did you learn about them? Facts get extracted automatically."
      />
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-amber/90">{state.notice}</p> : null}
      <SubmitButton>Add note</SubmitButton>
    </form>
  );
}
