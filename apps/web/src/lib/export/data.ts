import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  cardImages,
  companies,
  contacts,
  edges,
  facts,
  followUps,
  notes,
  eventContacts,
  events,
  signals,
  type ContactRow,
} from "@/lib/db/schema";

export interface ExportContact extends ContactRow {
  companyName: string | null;
}

export async function exportContacts(): Promise<ExportContact[]> {
  const db = await getDb();
  const rows = await db
    .select({ contact: contacts, companyName: companies.name })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .orderBy(contacts.createdAt);
  return rows.map((row) => ({ ...row.contact, companyName: row.companyName }));
}

/** Full graph dump — the "you can always leave" JSON (M8). */
export async function exportEverything(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const [
    allContacts,
    allCompanies,
    allEvents,
    allEventContacts,
    allNotes,
    allFacts,
    allEdges,
    allFollowUps,
    allSignals,
    allCardImages,
  ] = await Promise.all([
    db.select().from(contacts),
    db.select().from(companies),
    db.select().from(events),
    db.select().from(eventContacts),
    db.select().from(notes).where(isNull(notes.deletedAt)),
    db.select().from(facts).where(isNull(facts.deletedAt)),
    db.select().from(edges).where(isNull(edges.deletedAt)),
    db.select().from(followUps),
    db.select().from(signals),
    db.select().from(cardImages),
  ]);
  return {
    exported_at: new Date().toISOString(),
    contacts: allContacts,
    companies: allCompanies,
    events: allEvents,
    event_contacts: allEventContacts,
    notes: allNotes,
    facts: allFacts,
    edges: allEdges,
    follow_ups: allFollowUps,
    signals: allSignals,
    card_images: allCardImages,
  };
}
