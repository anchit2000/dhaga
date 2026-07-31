"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { FormError } from "@/components/app/feedback";
import { draftFollowUpAction, type DraftState } from "@/lib/actions/drafts";
import { Textarea } from "@/components/ui/textarea";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { DRAFT_MESSAGES } from "@/utils/constants/loader-messages";
import { AiGateNotice } from "../AiGateNotice";
import { SubmitButton } from "../SubmitButton";

/** M7: one-tap follow-up draft — editable, copy-to-clipboard. */
export function DraftSection({
  contactId,
  aiGate,
}: {
  contactId: string;
  /** Why AI is unavailable (no credits left), or null when it is usable. */
  aiGate: string | null;
}) {
  const [state, formAction, pending] = useActionState<DraftState, FormData>(
    draftFollowUpAction,
    {},
  );
  // Edits are keyed to the draft they started from, so a redraft resets them.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const text = edit && edit.base === state.draft ? edit.text : (state.draft ?? "");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Follow-up draft</h2>
        <form action={formAction}>
          <input type="hidden" name="contactId" value={contactId} />
          <SubmitButton className="h-9 px-4 text-sm" disabled={aiGate !== null}>
            {state.draft ? "Redraft ✦" : "Draft follow-up ✦"}
          </SubmitButton>
        </form>
      </div>
      <FormError message={state.error} />
      {aiGate ? <AiGateNotice reason={aiGate} /> : null}
      {pending ? (
        <ThreadLoader messages={DRAFT_MESSAGES} />
      ) : state.draft ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(event) =>
              setEdit({ base: state.draft ?? "", text: event.target.value })
            }
            rows={6}
            className="text-sm leading-relaxed"
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-seam px-3 py-1.5 text-xs text-fog transition-colors hover:text-paper"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-fog">
          Uses their facts, notes, and where you met — so it reads personal, not
          templated.
        </p>
      )}
    </section>
  );
}
