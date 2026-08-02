"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { Button } from "@/components/ui/button";
import { addSignalAsNoteAction, dismissSignalAction } from "@/lib/actions/signals";
import { cn } from "@/lib/utils";

/**
 * Pill submit with an in-flight spinner. Add-as-note runs an LLM extraction and
 * can take a moment — without this the user gets no feedback that the click
 * landed. A transient throw is still turned into a toast by the surrounding
 * ActionForm; this only adds the pending affordance.
 */
function PillSubmit({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-1 disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {label}
    </button>
  );
}

export interface SignalCardData {
  id: string;
  contactId: string;
  contactName: string;
  companyName?: string | null;
  kind: string;
  headline: string;
  detail: string;
  sourceUrl: string | null;
}

/**
 * One job-change/news alert (BRD §6.7). Shared by the contact page (its own
 * signals) and the Home "Signals" feed (across the graph) so the card and
 * its actions live in exactly one place.
 */
export function SignalCard({
  signal,
  showContact,
  onContactClick,
}: {
  signal: SignalCardData;
  showContact: boolean;
  /** When provided (Home's feed), opens the contact detail Sheet instead of
   *  navigating — the contact page's own list leaves this unset. */
  onContactClick?: (contactId: string) => void;
}) {
  return (
    <li className="rounded-xl border border-magic/25 bg-magic/[0.05] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-magic/40 px-2 py-0.5 text-[11px] text-magic">
              {signal.kind === "job_change" ? "Job change" : "News"}
            </span>
            {showContact ? (
              onContactClick ? (
                <Button
                  render={<div />}
                  variant="ghost"
                  onClick={() => onContactClick(signal.contactId)}
                  className="h-auto rounded-md p-0 text-sm font-medium normal-case text-paper hover:bg-transparent hover:underline"
                >
                  {signal.contactName}
                </Button>
              ) : (
                <Link
                  href={`/app/people/${signal.contactId}`}
                  className="text-sm font-medium text-paper hover:underline"
                >
                  {signal.contactName}
                </Link>
              )
            ) : null}
            {showContact && signal.companyName ? (
              <span className="text-xs text-fog">{signal.companyName}</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-paper">{signal.headline}</p>
          <p className="mt-0.5 text-xs text-fog">{signal.detail}</p>
          {signal.sourceUrl ? (
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-magic underline-offset-2 hover:underline"
            >
              Source
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <ActionForm
            action={addSignalAsNoteAction}
            errorMessage="Couldn't add the signal as a note."
          >
            <input type="hidden" name="signalId" value={signal.id} />
            <input type="hidden" name="contactId" value={signal.contactId} />
            <input type="hidden" name="contactName" value={signal.contactName} />
            <PillSubmit
              label="Add as note"
              className="rounded-full border border-magic/40 px-2.5 py-1 text-[11px] text-magic transition-colors hover:bg-magic/10"
            />
          </ActionForm>
          <ActionForm
            action={dismissSignalAction}
            errorMessage="Couldn't dismiss the signal."
          >
            <input type="hidden" name="signalId" value={signal.id} />
            <input type="hidden" name="contactId" value={signal.contactId} />
            <PillSubmit
              label="Dismiss"
              className="rounded-full border border-seam px-2.5 py-1 text-[11px] text-fog transition-colors hover:bg-wash/[0.04]"
            />
          </ActionForm>
        </div>
      </div>
    </li>
  );
}
