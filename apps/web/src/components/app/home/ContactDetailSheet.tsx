"use client";

import { startTransition, useActionState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DetailChips } from "@/components/app/contact/DetailChips";
import { FactList } from "@/components/app/contact/FactList";
import { NoteList } from "@/components/app/contact/NoteList";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getContactSummaryAction,
  type ContactSummaryState,
} from "@/lib/actions/contact-summary";

const EMPTY_STATE: ContactSummaryState = {};

/**
 * Right-side detail panel for the Home feed (one Sheet, all breakpoints —
 * see CLAUDE.md on avoiding a separate desktop-panel/mobile-sheet split).
 * Fetches a focused contact snapshot on demand via a server action, the
 * same on-demand-dispatch shape SearchPalette already uses for its actions.
 */
export function ContactDetailSheet({
  contactId,
  onOpenChange,
}: {
  contactId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, dispatch, pending] = useActionState(getContactSummaryAction, EMPTY_STATE);

  useEffect(() => {
    if (!contactId) return;
    const data = new FormData();
    data.set("contactId", contactId);
    startTransition(() => dispatch(data));
  }, [contactId, dispatch]);

  const summary = !pending ? state.summary : undefined;
  const error = !pending ? state.error : undefined;

  return (
    <Sheet open={contactId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {pending || !summary ? (
          error ? (
            <p className="p-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : (
            <div className="space-y-4 p-4" aria-busy="true">
              <SheetTitle className="sr-only">Loading contact</SheetTitle>
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )
        ) : (
          <div className="space-y-5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xl text-amber">
                {summary.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate font-display text-xl">
                  {summary.name}
                </SheetTitle>
                <p className="mt-0.5 truncate text-sm text-fog">
                  {[summary.title, summary.companyName].filter(Boolean).join(" · ") ||
                    "No title or company yet"}
                </p>
                {summary.events.length > 0 || summary.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {summary.events.map((event) => (
                      <Link
                        key={event.id}
                        href={`/app/events/${event.id}`}
                        className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-amber transition-colors hover:bg-amber/20"
                      >
                        {event.name}
                      </Link>
                    ))}
                    {summary.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-seam bg-wash/[0.04] px-2.5 py-0.5 text-xs text-fog"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailChips label="Email" values={summary.emails} />
              <DetailChips label="Phone" values={summary.phones} />
              <DetailChips label="Links" values={summary.links} />
              <DetailChips label="Location" values={summary.location ? [summary.location] : []} />
            </div>

            <section className="space-y-2">
              <h3 className="font-display text-sm">Facts</h3>
              <FactList contactId={summary.id} facts={summary.facts} />
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-sm">Recent notes</h3>
              <NoteList contactId={summary.id} notes={summary.notes} />
            </section>

            <Link
              href={`/app/people/${summary.id}`}
              className="inline-flex min-h-11 items-center gap-1 text-sm text-ember hover:underline"
            >
              View full profile <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
