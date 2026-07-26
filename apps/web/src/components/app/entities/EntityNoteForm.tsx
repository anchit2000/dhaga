"use client";

import { useActionState, useRef } from "react";
import { addEntityNoteAction, type NoteFormState } from "@/lib/actions/notes";
import { FormError } from "@/components/app/feedback";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "../SubmitButton";

/** Plain entity notes — no dictation, no extraction (contact-note features). */
export function EntityNoteForm({ entityId }: { entityId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    async (previous, formData) => {
      const result = await addEntityNoteAction(previous, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="entityId" value={entityId} />
      <Textarea
        name="body"
        required
        rows={3}
        placeholder="What's worth remembering about this place or thing?"
      />
      <FormError message={state.error} />
      <SubmitButton>Add note</SubmitButton>
    </form>
  );
}
