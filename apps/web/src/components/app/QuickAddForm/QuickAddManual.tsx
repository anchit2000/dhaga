"use client";

import type { ReactElement } from "react";
import { ArrowLeft } from "lucide-react";
import { emptyContactProfile } from "@dhaga/core";
import { ContactForm } from "../ContactForm";
import { EventPicker, type EventOption } from "../EventPicker";

/** Skip-AI path: a blank {@link ContactForm} (same one QuickAddResult renders,
 *  seeded empty) so the user types a person in by hand and saves via the normal
 *  createContactAction — no `source` field, so it lands as a "manual" contact.
 *  Reachable from every capture mode via CaptureForm's "Add manually" button. */
export function QuickAddManual({
  events,
  defaultEventId,
  onBack,
}: {
  events: EventOption[];
  defaultEventId?: string;
  onBack: () => void;
}): ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
          Manual entry
        </span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1 text-xs text-fog underline-offset-2 hover:text-paper hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to capture
        </button>
      </div>
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <ContactForm initial={emptyContactProfile()} submitLabel="Save person">
          <EventPicker events={events} defaultEventId={defaultEventId} />
        </ContactForm>
      </div>
    </div>
  );
}
