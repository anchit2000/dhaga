"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { forgetContactAction } from "@/lib/actions/contacts";

function ForgetSubmit({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-400/90 transition-colors hover:bg-red-400/10 disabled:pointer-events-none"
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
    <form action={forgetContactAction}>
      <input type="hidden" name="contactId" value={contactId} />
      <ForgetSubmit name={name} />
    </form>
  );
}
