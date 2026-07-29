"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { forgetContactAction } from "@/lib/actions/contacts";

function ForgetSubmit({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive/90 transition-colors hover:bg-destructive/10 disabled:pointer-events-none"
      onClick={(event) => {
        if (
          !confirm(
            `Forget ${name}? This permanently deletes the contact, all notes, facts, edges, and follow-ups. There is no undo.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      Forget this person
    </button>
  );
}

export function ForgetButton({
  contactId,
  name,
}: {
  contactId: string;
  name: string;
}) {
  return (
    <ActionForm
      action={forgetContactAction}
      errorMessage="Couldn't forget this contact — try again."
    >
      <input type="hidden" name="contactId" value={contactId} />
      <ForgetSubmit name={name} />
    </ActionForm>
  );
}
