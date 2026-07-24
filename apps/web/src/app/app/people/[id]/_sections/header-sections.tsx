import Link from "next/link";
import { AddToEventPicker } from "@/components/app/AddToEventPicker";
import { MentionedPersonActions } from "@/components/app/contact/MentionedPersonActions";
import { listMentionMergeCandidates } from "@/lib/repo/contacts";
import { loadContactEvents } from "./loaders";

/**
 * The identity header's group + tag chips, with the "Add to group" action
 * living inline at the end of the row so it reads as an intentional part of the
 * groups list rather than a stray box below it. Streams in with its events
 * query; the rest of the header (name, title, actions) paints immediately.
 */
export async function GroupChipsSection({
  contactId,
  tags,
}: {
  contactId: string;
  tags: string[];
}): Promise<React.ReactElement> {
  const events = await loadContactEvents(contactId);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/app/events/${event.id}`}
          className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-amber transition-colors hover:bg-amber/20"
        >
          {event.name}
        </Link>
      ))}
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-seam bg-wash/[0.04] px-2.5 py-0.5 text-xs text-fog"
        >
          {tag}
        </span>
      ))}
      <AddToEventPicker
        contactId={contactId}
        currentEventIds={events.map((event) => event.id)}
      />
    </div>
  );
}

/** Merge-suggestion banner for a mentioned-only person; its own boundary since
 *  the candidate lookup runs only when the contact came from a mention. */
export async function MergeCandidatesSection({
  contactId,
  name,
}: {
  contactId: string;
  name: string;
}): Promise<React.ReactElement> {
  const candidates = await listMentionMergeCandidates(contactId, name);
  return (
    <MentionedPersonActions
      contactId={contactId}
      name={name}
      candidates={candidates}
    />
  );
}
