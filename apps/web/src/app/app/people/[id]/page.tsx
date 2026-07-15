import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Waypoints } from "lucide-react";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getContact, listMentionMergeCandidates } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import {
  listRecentExtractionJobs,
  toExtractionJobView,
} from "@/lib/repo/extraction-jobs";
import { listContactEvents } from "@/lib/repo/events";
import { listCardImageRefs } from "@/lib/repo/card-images";
import { isReachOutDue } from "@/lib/repo/reminders";
import { listContactSignals } from "@/lib/repo/signals";
import { Button } from "@/components/ui/button";
import { AddNoteForm } from "@/components/app/contact/AddNoteForm";
import { CardPhotoStrip } from "@/components/app/contact/CardPhotoStrip";
import { BriefSection } from "@/components/app/contact/BriefSection";
import { ContactSignalList } from "@/components/app/contact/ContactSignalList";
import { KeepInTouch } from "@/components/app/contact/KeepInTouch";
import { WatchToggle } from "@/components/app/contact/WatchToggle";
import { OnDemandNetwork } from "@/components/app/contact/OnDemandNetwork";
import { ContactInfoCard } from "@/components/app/contact/ContactInfoCard";
import { DraftSection } from "@/components/app/contact/DraftSection";
import { EnrichButton } from "@/components/app/contact/EnrichButton";
import { ExtractionStatus } from "@/components/app/contact/ExtractionStatus";
import { FactList } from "@/components/app/contact/FactList";
import { FollowUpList } from "@/components/app/contact/FollowUpList";
import { ForgetButton } from "@/components/app/contact/ForgetButton";
import { NoteList } from "@/components/app/contact/NoteList";
import { Timeline } from "@/components/app/contact/Timeline";
import { MentionedPersonActions } from "@/components/app/contact/MentionedPersonActions";

export const metadata = { title: "Person — Dhaga" };

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserIdForPage();
  const { id } = await params;
  const detail = await getContact(id);
  if (!detail) notFound();
  const { contact, companyName } = detail;
  const [
    contactNotes,
    contactFacts,
    openFollowUps,
    contactEvents,
    cardPhotos,
    contactSignals,
    extractionJobRows,
  ] = await Promise.all([
    listNotes(id),
    listFacts(id),
    listOpenFollowUps(id),
    listContactEvents(id),
    listCardImageRefs(id),
    listContactSignals(id),
    listRecentExtractionJobs(id),
  ]);
  const extractionJobs = extractionJobRows.map((row) => toExtractionJobView(row));
  const lastTouch = contact.lastReachedOutAt ?? contact.createdAt;
  const isDue = isReachOutDue(contact.reachOutEveryDays, lastTouch);
  const mergeCandidates =
    contact.source === "mentioned"
      ? await listMentionMergeCandidates(id, contact.name)
      : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xl text-amber">
            {contact.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl tracking-tight">
              {contact.name}
              {contact.nickname ? (
                <span className="ml-2 text-lg text-fog">“{contact.nickname}”</span>
              ) : null}
            </h1>
            <p className="mt-0.5 text-sm text-fog">
              {[contact.title, companyName].filter(Boolean).join(" · ") ||
                "No title or company yet"}
            </p>
            {contactEvents.length > 0 || contact.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contactEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/app/events/${event.id}`}
                    className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-amber transition-colors hover:bg-amber/20"
                  >
                    {event.name}
                  </Link>
                ))}
                {contact.tags.map((tag) => (
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
        <div className="flex flex-wrap gap-2">
          <Button
            render={<Link href={`/app/people/${id}/edit`} />}
            variant="outline"
            size="sm"
          >
            <Pencil />
            Edit
          </Button>
          <Button
            render={<Link href={`/app/graph?focus=${id}`} />}
            variant="outline"
            size="sm"
          >
            <Waypoints />
            View in graph
          </Button>
        </div>
      </div>

      {contact.source === "mentioned" ? (
        <MentionedPersonActions
          contactId={id}
          name={contact.name}
          candidates={mergeCandidates}
        />
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <BriefSection contactId={id} />
          <OnDemandNetwork contactId={id} />
          <FollowUpList contactId={id} followUps={openFollowUps} />
          <section className="space-y-3">
            <h2 className="font-display text-lg">Facts</h2>
            <ExtractionStatus contactId={id} initialJobs={extractionJobs} />
            <FactList contactId={id} facts={contactFacts} />
            <EnrichButton contactId={id} />
          </section>
          <section className="space-y-3">
            <h2 className="font-display text-lg">Notes</h2>
            <AddNoteForm contactId={id} />
            <NoteList contactId={id} notes={contactNotes} />
          </section>
          <DraftSection contactId={id} />
          <Timeline
            createdAt={contact.createdAt}
            source={contact.source}
            lastReachedOutAt={contact.lastReachedOutAt}
            events={contactEvents}
            notes={contactNotes}
          />
        </div>

        <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-20">
          <ContactInfoCard detail={detail} />
          <CardPhotoStrip images={cardPhotos} />
          <KeepInTouch
            contactId={id}
            everyDays={contact.reachOutEveryDays}
            lastTouch={lastTouch.toLocaleDateString()}
            due={isDue}
          />
          <WatchToggle
            contactId={id}
            watched={contact.watchedForSignals}
          />
          <ContactSignalList
            contactId={id}
            contactName={contact.name}
            signals={contactSignals}
          />
        </aside>
      </div>

      <div className="border-t border-seam pt-5">
        <ForgetButton contactId={id} name={contact.name} />
      </div>
    </div>
  );
}
