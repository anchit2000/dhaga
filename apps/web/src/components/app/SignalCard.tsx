"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addSignalAsNoteAction, dismissSignalAction } from "@/lib/actions/signals";

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
    <li className="rounded-xl border border-amber/25 bg-amber/[0.05] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber/40 px-2 py-0.5 text-[11px] text-amber">
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
              className="mt-1 inline-block text-xs text-amber underline-offset-2 hover:underline"
            >
              Source
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <form action={addSignalAsNoteAction}>
            <input type="hidden" name="signalId" value={signal.id} />
            <input type="hidden" name="contactId" value={signal.contactId} />
            <input type="hidden" name="contactName" value={signal.contactName} />
            <button
              type="submit"
              className="rounded-full border border-amber/40 px-2.5 py-1 text-[11px] text-amber transition-colors hover:bg-amber/10"
            >
              Add as note
            </button>
          </form>
          <form action={dismissSignalAction}>
            <input type="hidden" name="signalId" value={signal.id} />
            <input type="hidden" name="contactId" value={signal.contactId} />
            <button
              type="submit"
              className="rounded-full border border-seam px-2.5 py-1 text-[11px] text-fog transition-colors hover:bg-paper/[0.04]"
            >
              Dismiss
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
