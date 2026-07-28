"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { BadgeCheck, Loader2, Pencil } from "lucide-react";
import { ActionForm, runAction } from "@/components/app/ActionForm";
import {
  deleteFactAction,
  updateFactAction,
  verifyFactAction,
} from "@/lib/actions/notes";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "./DeleteButton";
import { SaveButton } from "./SaveButton";

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Confirm fact"
      title="Confirm — looks right"
      className="rounded-full p-1 text-ember transition-colors hover:bg-amber/15 disabled:pointer-events-none"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <BadgeCheck className="size-3.5" />
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
  /** Web-sourced fact awaiting the user's confirm/delete (enrichment). */
  unverified?: boolean;
}

/** One fact row: receipt-labelled, editable in place, deletable (M4).
 *  Web-sourced facts are badged unverified with a one-tap confirm. */
export function FactItem({
  contactId,
  factId,
  text,
  type,
  receipt,
  unverified = false,
}: FactItemProps) {
  const [editing, setEditing] = useState(false);

  return (
    <li
      className={`flex items-start gap-2 rounded-lg border-l-2 bg-panel px-3 py-2 ${
        unverified ? "border-amber/40" : "border-amber"
      }`}
    >
      {editing ? (
        <form
          action={async (formData) => {
            // Keep the row in edit mode (text intact) if the save throws — a
            // transient failure becomes a toast, never the full-page boundary.
            const ok = await runAction(
              () => updateFactAction(formData),
              "Couldn't save that fact — try again.",
            );
            if (ok) setEditing(false);
          }}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <input type="hidden" name="factId" value={factId} />
          <input type="hidden" name="contactId" value={contactId} />
          <Input name="text" defaultValue={text} required autoFocus className="h-8 text-sm" />
          <SaveButton label="Save fact" />
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
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fog">
              <span>
                {type}
                {receipt ? ` · ${receipt}` : ""}
              </span>
              {unverified ? (
                <span className="rounded-full bg-amber/15 px-1.5 py-px text-ember">
                  unverified
                </span>
              ) : null}
            </p>
          </div>
          {unverified ? (
            <ActionForm
              action={verifyFactAction}
              errorMessage="Couldn't confirm that fact — try again."
            >
              <input type="hidden" name="factId" value={factId} />
              <input type="hidden" name="contactId" value={contactId} />
              <VerifyButton />
            </ActionForm>
          ) : null}
          <button
            type="button"
            aria-label="Edit fact"
            title="Edit fact"
            onClick={() => setEditing(true)}
            className="rounded-full p-1 text-fog transition-colors hover:bg-wash/[0.06] hover:text-paper"
          >
            <Pencil className="size-3.5" />
          </button>
          <ActionForm
            action={deleteFactAction}
            errorMessage="Couldn't delete that fact."
          >
            <input type="hidden" name="factId" value={factId} />
            <input type="hidden" name="contactId" value={contactId} />
            <DeleteButton label="Delete fact" />
          </ActionForm>
        </>
      )}
    </li>
  );
}
