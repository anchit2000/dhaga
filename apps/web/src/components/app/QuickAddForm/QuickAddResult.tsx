import Link from "next/link";
import type { ExtractedContact } from "@dhaga/core";
import { ContactForm } from "../ContactForm";
import { EventPicker, type EventOption } from "../EventPicker";

/** Review-and-save screen shown once a paste/photo capture has been parsed
 *  into a contact — the shared endpoint every capture mode converges on. */
export function QuickAddResult({
  contact,
  via,
  notice,
  sourceText,
  imageBase64,
  imageType,
  events,
  defaultEventId,
}: {
  contact: ExtractedContact;
  via?: "ai" | "heuristic";
  notice?: string;
  sourceText?: string;
  imageBase64?: string;
  imageType?: string;
  events: EventOption[];
  defaultEventId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
          {via === "ai" ? "Extracted with AI" : "Parsed offline"}
        </span>
        <Link
          href="/app/quick-add"
          className="text-xs text-fog underline-offset-2 hover:text-paper hover:underline"
        >
          Start over
        </Link>
      </div>
      {notice ? <p className="text-sm text-fog">{notice}</p> : null}
      <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
        <ContactForm initial={contact} submitLabel="Save person">
          <input type="hidden" name="source" value="quick_add" />
          <input type="hidden" name="sourceText" value={sourceText ?? ""} />
          <input type="hidden" name="imageBase64" value={imageBase64 ?? ""} />
          <input type="hidden" name="imageType" value={imageType ?? ""} />
          <EventPicker events={events} defaultEventId={defaultEventId} />
        </ContactForm>
      </div>
    </div>
  );
}
