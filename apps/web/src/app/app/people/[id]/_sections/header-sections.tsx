import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { StarButton } from "@/components/app/contact/StarButton";
import { TagCombobox } from "@/components/app/contact/TagCombobox";
import { MentionedPersonActions } from "@/components/app/contact/MentionedPersonActions";
import { listMentionMergeCandidates } from "@/lib/repo/contacts";
import { loadContactEvents } from "./loaders";
import type { ContactDetail } from "@/lib/repo/contacts";

/**
 * The identity block: avatar, name + star, title/company, groups row, tags
 * row. Pulled out of the page component to keep it under the file-length
 * convention; purely presentational except for the Suspense-streamed groups
 * chip row.
 */
export function PersonIdentityHeader({
  contactId,
  contact,
  companyName,
}: {
  contactId: string;
  contact: ContactDetail["contact"];
  companyName: string | null;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-4">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xl text-ember">
        {contact.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-2xl tracking-tight">
            {contact.name}
            {contact.nickname ? (
              <span className="ml-2 text-lg text-fog">“{contact.nickname}”</span>
            ) : null}
          </h1>
          <StarButton contactId={contactId} starred={contact.starred} />
        </div>
        <p className="mt-0.5 text-sm text-fog">
          {[contact.title, companyName].filter(Boolean).join(" · ") ||
            "No title or company yet"}
        </p>
        <Suspense
          fallback={
            <div className="mt-2">
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>
          }
        >
          <GroupChipsSection contactId={contactId} />
        </Suspense>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-seam bg-wash/[0.04] px-2.5 py-0.5 text-xs text-fog"
            >
              {tag}
            </span>
          ))}
          <TagCombobox contactId={contactId} currentTags={contact.tags} />
        </div>
      </div>
    </div>
  );
}

/**
 * The identity header's groups row — just the event chips. Tags render as
 * their own row (see the person page) and "Add to group" moved to the
 * sticky-sidebar actions card, so this streams in with its events query alone;
 * the rest of the header (name, title, actions) paints immediately. Renders
 * nothing when the contact belongs to no groups.
 */
export async function GroupChipsSection({
  contactId,
}: {
  contactId: string;
}): Promise<React.ReactElement | null> {
  const events = await loadContactEvents(contactId);
  if (events.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/app/events/${event.id}`}
          className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-ember transition-colors hover:bg-amber/20"
        >
          {event.name}
        </Link>
      ))}
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
