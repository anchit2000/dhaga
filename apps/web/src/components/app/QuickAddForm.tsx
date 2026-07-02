"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  extractQuickAddAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { Textarea } from "@/components/ui/textarea";
import { ContactForm } from "./ContactForm";
import { SessionPicker, type SessionOption } from "./SessionPicker";
import { SubmitButton } from "./SubmitButton";

/** Two steps: paste → extract, then review-and-save with session attach. */
export function QuickAddForm({ sessions }: { sessions: SessionOption[] }) {
  const [state, extractAction] = useActionState<QuickAddState, FormData>(
    extractQuickAddAction,
    {},
  );

  if (state.contact) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
            {state.via === "ai" ? "Extracted with AI" : "Parsed offline"}
          </span>
          <Link
            href="/app/quick-add"
            className="text-xs text-fog underline-offset-2 hover:text-paper hover:underline"
          >
            Start over
          </Link>
        </div>
        {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}
        <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
          <ContactForm initial={state.contact} submitLabel="Save person">
            <input type="hidden" name="source" value="quick_add" />
            <input type="hidden" name="sourceText" value={state.sourceText ?? ""} />
            <SessionPicker sessions={sessions} />
          </ContactForm>
        </div>
      </div>
    );
  }

  return (
    <form action={extractAction} className="space-y-4">
      <Textarea
        name="raw"
        required
        rows={8}
        placeholder={
          "Paste anything with a person in it —\nan email signature, card text, a LinkedIn intro…"
        }
        className="font-mono text-sm"
      />
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}
      <SubmitButton>Extract contact</SubmitButton>
    </form>
  );
}
