import { listFacts, listOpenFollowUps } from "@/lib/repo/notes";
import {
  listRecentExtractionJobs,
  toExtractionJobView,
} from "@/lib/repo/extraction-jobs";
import { listContactRelationships } from "@/lib/repo/relationships";
import { AddNoteForm } from "@/components/app/contact/AddNoteForm";
import { EnrichButton } from "@/components/app/contact/EnrichButton";
import { ExtractionStatus } from "@/components/app/contact/ExtractionStatus";
import { FactList } from "@/components/app/contact/FactList";
import { FollowUpList } from "@/components/app/contact/FollowUpList";
import { NoteList } from "@/components/app/contact/NoteList";
import { RelationshipSection } from "@/components/app/relationships/RelationshipSection";
import { Timeline } from "@/components/app/contact/Timeline";
import { loadContactEvents, loadContactNotes } from "./loaders";

export async function RelationshipsSection({
  contactId,
  name,
}: {
  contactId: string;
  name: string;
}): Promise<React.ReactElement> {
  const relationships = await listContactRelationships(contactId);
  return (
    <RelationshipSection
      sourceId={contactId}
      sourceKind="contact"
      sourceLabel={name}
      rows={relationships.map((relationship) => ({
        edgeId: relationship.edgeId,
        targetId: relationship.contactId,
        kind: relationship.kind,
        name: relationship.name,
        role: relationship.role,
        mentioned: relationship.mentioned,
      }))}
    />
  );
}

export async function FollowUpsSection({
  contactId,
}: {
  contactId: string;
}): Promise<React.ReactElement> {
  const followUps = await listOpenFollowUps(contactId);
  return <FollowUpList contactId={contactId} followUps={followUps} />;
}

// FactList imports FACT_TYPES (a runtime value) server-side — this wrapper must
// stay a Server Component so that import never reaches the client bundle.
export async function FactsSection({
  contactId,
}: {
  contactId: string;
}): Promise<React.ReactElement> {
  const [facts, jobRows] = await Promise.all([
    listFacts(contactId),
    listRecentExtractionJobs(contactId),
  ]);
  const extractionJobs = jobRows.map((row) => toExtractionJobView(row));
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Facts</h2>
      <ExtractionStatus contactId={contactId} initialJobs={extractionJobs} />
      <FactList contactId={contactId} facts={facts} />
      <EnrichButton contactId={contactId} />
    </section>
  );
}

export async function NotesSection({
  contactId,
}: {
  contactId: string;
}): Promise<React.ReactElement> {
  const notes = await loadContactNotes(contactId);
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Notes</h2>
      <AddNoteForm contactId={contactId} />
      <NoteList contactId={contactId} notes={notes} />
    </section>
  );
}

export async function TimelineSection({
  contactId,
  createdAt,
  source,
  lastReachedOutAt,
}: {
  contactId: string;
  createdAt: Date;
  source: string;
  lastReachedOutAt: Date | null;
}): Promise<React.ReactElement> {
  const [events, notes] = await Promise.all([
    loadContactEvents(contactId),
    loadContactNotes(contactId),
  ]);
  return (
    <Timeline
      createdAt={createdAt}
      source={source}
      lastReachedOutAt={lastReachedOutAt}
      events={events}
      notes={notes}
    />
  );
}
