"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { generateBriefAction } from "@/lib/actions/brief";
import type { BriefResult } from "@/lib/ai/brief";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { BRIEF_MESSAGES } from "@/utils/constants/loader-messages";
import { SubmitButton } from "../SubmitButton";

/** v1.2: one-tap pre-meeting dossier from the graph, with copy. */
export function BriefSection({ contactId }: { contactId: string }) {
  const [state, formAction, pending] = useActionState<BriefResult, FormData>(
    generateBriefAction,
    {},
  );
  const [copied, setCopied] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Pre-meeting brief</h2>
        <form action={formAction}>
          <input type="hidden" name="contactId" value={contactId} />
          <SubmitButton className="h-9 px-4 text-sm">
            {state.brief ? "Refresh brief ✦" : "Brief me ✦"}
          </SubmitButton>
        </form>
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {pending ? (
        <ThreadLoader messages={BRIEF_MESSAGES} />
      ) : state.brief ? (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap rounded-2xl border border-amber/25 bg-amber/[0.04] p-4 text-sm leading-relaxed text-paper">
            {state.brief}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-seam px-3 py-1.5 text-xs text-fog transition-colors hover:text-paper"
            onClick={async () => {
              await navigator.clipboard.writeText(state.brief ?? "");
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
          Everything you know about them, compressed for the two minutes before
          the meeting — who they are, open loops, and grounded openers.
        </p>
      )}
    </section>
  );
}
