"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addFactAction } from "@/lib/actions/manual-entries";
import type { NoteFormState } from "@/lib/actions/notes";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "../SubmitButton";

/** Add a fact by hand — no note, no extraction. The fact types come from the
 *  server (FactList) so this client component never imports @dhaga/core's
 *  runtime (which would pull server-only LLM code into the bundle). */
export function AddFactForm({
  contactId,
  factTypes,
}: {
  contactId: string;
  factTypes: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    async (previous, formData) => {
      const result = await addFactAction(previous, formData);
      if (!result.error) formRef.current?.reset();
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
        Add fact
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
      <Input name="text" required autoFocus placeholder="A fact about them" className="text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          name="type"
          defaultValue="personal"
          aria-label="Fact type"
          className="h-8 w-auto text-sm"
        >
          {factTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <SubmitButton className="h-8">Add fact</SubmitButton>
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
