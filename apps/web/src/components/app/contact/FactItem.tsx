"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Pencil } from "lucide-react";
import { deleteFactAction, updateFactAction } from "@/lib/actions/notes";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "./DeleteButton";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Save fact"
      className="rounded-full p-1 text-ember transition-colors hover:bg-amber/15 disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Check className="size-3.5" />
      )}
    </button>
  );
}

export interface FactItemProps {
  contactId: string;
  factId: string;
  text: string;
  type: string;
  receipt: string | null;
}

/** One fact row: receipt-labelled, editable in place, deletable (M4). */
export function FactItem({ contactId, factId, text, type, receipt }: FactItemProps) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-start gap-2 rounded-lg border-l-2 border-amber bg-panel px-3 py-2">
      {editing ? (
        <form
          action={async (formData) => {
            await updateFactAction(formData);
            setEditing(false);
          }}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <input type="hidden" name="factId" value={factId} />
          <input type="hidden" name="contactId" value={contactId} />
          <Input name="text" defaultValue={text} required autoFocus className="h-8 text-sm" />
          <SaveButton />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-fog transition-colors hover:text-paper"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-paper">{text}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fog/60">
              {type}
              {receipt ? ` · ${receipt}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Edit fact"
            title="Edit fact"
            onClick={() => setEditing(true)}
            className="rounded-full p-1 text-fog/60 transition-colors hover:bg-wash/[0.06] hover:text-paper"
          >
            <Pencil className="size-3.5" />
          </button>
          <form action={deleteFactAction}>
            <input type="hidden" name="factId" value={factId} />
            <input type="hidden" name="contactId" value={contactId} />
            <DeleteButton label="Delete fact" />
          </form>
        </>
      )}
    </li>
  );
}
