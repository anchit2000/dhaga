import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import { listContactSessions } from "@/lib/repo/sessions";
import { listContactConnections } from "@/lib/repo/connections";
import { listCardImageRefs } from "@/lib/repo/card-images";
import { recommendContacts } from "@/lib/repo/recommendations";
import { isReachOutDue } from "@/lib/repo/reminders";
import { listContactSignals } from "@/lib/repo/signals";
import { AddNoteForm } from "@/components/app/contact/AddNoteForm";
import { CardPhotoStrip } from "@/components/app/contact/CardPhotoStrip";
import { BriefSection } from "@/components/app/contact/BriefSection";
import { ConnectionsList } from "@/components/app/contact/ConnectionsList";
import { ContactSignalList } from "@/components/app/contact/ContactSignalList";
import { KeepInTouch } from "@/components/app/contact/KeepInTouch";
import { WatchToggle } from "@/components/app/contact/WatchToggle";
import { RecommendedList } from "@/components/app/contact/RecommendedList";
import { DetailChips } from "@/components/app/contact/DetailChips";
import { DraftSection } from "@/components/app/contact/DraftSection";
import { EnrichButton } from "@/components/app/contact/EnrichButton";
import { FactList } from "@/components/app/contact/FactList";
import { FollowUpList } from "@/components/app/contact/FollowUpList";
import { ForgetButton } from "@/components/app/contact/ForgetButton";
import { NoteList } from "@/components/app/contact/NoteList";
import { Timeline } from "@/components/app/contact/Timeline";

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
    contactSessions,
    connections,
    recommendations,
    cardPhotos,
    contactSignals,
  ] = await Promise.all([
    listNotes(id),
    listFacts(id),
    listOpenFollowUps(id),
    listContactSessions(id),
    listContactConnections(id),
    recommendContacts(id),
    listCardImageRefs(id),
    listContactSignals(id),
  ]);
  const lastTouch = contact.lastReachedOutAt ?? contact.createdAt;
  const isDue = isReachOutDue(contact.reachOutEveryDays, lastTouch);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xl text-amber">
          {contact.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl tracking-tight">
            {contact.name}
          </h1>
          <p className="mt-0.5 text-sm text-fog">
            {[contact.title, companyName].filter(Boolean).join(" · ") ||
              "No title or company yet"}
          </p>
          {contactSessions.length > 0 || contact.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contactSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/app/sessions/${session.id}`}
                  className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-amber transition-colors hover:bg-amber/20"
                >
                  {session.name}
                </Link>
              ))}
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-seam bg-paper/[0.04] px-2.5 py-0.5 text-xs text-fog"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-seam bg-panel p-5 sm:grid-cols-2 sm:p-6">
        <DetailChips label="Email" values={contact.emails} />
        <DetailChips label="Phone" values={contact.phones} />
        <DetailChips label="Links" values={contact.links} />
        <DetailChips
          label="Location"
          values={contact.location ? [contact.location] : []}
        />
      </div>

      <CardPhotoStrip images={cardPhotos} />

      <KeepInTouch
        contactId={id}
        everyDays={contact.reachOutEveryDays}
        lastTouch={lastTouch.toLocaleDateString()}
        due={isDue}
      />

      <WatchToggle contactId={id} watched={contact.watchedForSignals} />

      <ContactSignalList
        contactId={id}
        contactName={contact.name}
        signals={contactSignals}
      />

      <BriefSection contactId={id} />

      <ConnectionsList connections={connections} />

      <RecommendedList recommendations={recommendations} />

      <FollowUpList contactId={id} followUps={openFollowUps} />

      <section className="space-y-3">
        <h2 className="font-display text-lg">Facts</h2>
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
        sessions={contactSessions}
        notes={contactNotes}
      />

      <div className="border-t border-seam pt-5">
        <ForgetButton contactId={id} name={contact.name} />
      </div>
    </div>
  );
}
