"use client";

import { useActionState } from "react";
import { askAiAction, type AskAiState } from "@/lib/actions/search";
import { SubmitButton } from "../SubmitButton";

/** Explicit AI step — never fires on page load, only on click (metered). */
export function AskAi({ query }: { query: string }) {
  const [state, formAction] = useActionState<AskAiState, FormData>(
    askAiAction,
    {},
  );

  return (
    <div className="space-y-3 rounded-2xl border border-amber/25 bg-amber/[0.05] p-4">
      <form action={formAction} className="flex items-center justify-between gap-3">
        <p className="text-sm text-fog">
          Want a reasoned answer with receipts, not just matches?
        </p>
        <input type="hidden" name="q" value={query} />
        <SubmitButton className="h-9 shrink-0 px-4 text-sm">Ask AI ✦</SubmitButton>
      </form>
      {state.answer ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper">
          {state.answer}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}
    </div>
  );
}
