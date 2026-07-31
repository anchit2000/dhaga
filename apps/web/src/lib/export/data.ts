import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  cardImages,
  companies,
  companyAliases,
  contactLinks,
  contacts,
  edges,
  facts,
  followUps,
  notes,
  eventContacts,
  events,
  positions,
  signals,
  voiceVocab,
  type ContactRow,
} from "@/lib/db/schema";
import { isAuthoredContact } from "@/lib/repo/sync/authored";
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { ExportScope } from "@dhaga/core/src/api/export";
import type { DhagaDb } from "@/lib/db";

export interface ExportContact extends ContactRow {
  companyName: string | null;
}

export interface ExportContactsOptions {
  /** Omitted or "all" = every contact, unchanged: the M8 portability dump. */
  scope?: ExportScope;
  /** Drop contacts already linked on this provider. Omitted = no filtering. */
  provider?: ContactSyncProviderId | null;
}

/**
 * Contacts already tied to a record on this provider, whatever the link's
 * state. Tombstoned ("unlinked") links count exactly as offerUnlinkedCreates
 * counts them: the user deleted that person on their phone, and a bulk seed
 * that re-imported them would undo that decision as surely as a sync create.
 */
async function linkedContactIds(
  db: DhagaDb,
  provider: ContactSyncProviderId,
): Promise<Set<string>> {
  const rows = await db
    .select({ contactId: contactLinks.contactId })
    .from(contactLinks)
    .where(eq(contactLinks.provider, provider));
  return new Set(rows.map((row) => row.contactId));
}

/**
 * Contacts for the CSV/vCard export.
 *
 * With no options this returns every row — the "you can always leave with all
 * your data" guarantee (M8), which must not be narrowed. The options exist for
 * the other job the same file does: seeding an address book in bulk by
 * importing a .vcf, where provenance decides what may be written outward.
 */
export async function exportContacts(
  options: ExportContactsOptions = {},
): Promise<ExportContact[]> {
  const db = await getDb();
  const rows = await db
    .select({ contact: contacts, companyName: companies.name })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .orderBy(contacts.createdAt);
  let out: ExportContact[] = rows.map((row) => ({
    ...row.contact,
    companyName: row.companyName,
  }));
  // Filtered in TS against the shared predicate rather than as a SQL WHERE:
  // a second, SQL-shaped copy of "authored" is exactly the drift the shared
  // predicate exists to prevent.
  if (options.scope === "authored") out = out.filter(isAuthoredContact);
  if (options.provider) {
    const linked = await linkedContactIds(db, options.provider);
    out = out.filter((row) => !linked.has(row.id));
  }
  return out;
}

/** Full graph dump — the "you can always leave" JSON (M8). */
export async function exportEverything(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const [
    allContacts,
    allCompanies,
    allCompanyAliases,
    allPositions,
    allEvents,
    allEventContacts,
    allNotes,
    allFacts,
    allEdges,
    allFollowUps,
    allSignals,
    allCardImages,
    allVoiceVocab,
  ] = await Promise.all([
    db.select().from(contacts),
    db.select().from(companies),
    db.select().from(companyAliases),
    db.select().from(positions),
    db.select().from(events),
    db.select().from(eventContacts),
    db.select().from(notes).where(isNull(notes.deletedAt)),
    db.select().from(facts).where(isNull(facts.deletedAt)),
    db.select().from(edges).where(isNull(edges.deletedAt)),
    db.select().from(followUps),
    db.select().from(signals),
    db.select().from(cardImages),
    db.select().from(voiceVocab),
  ]);
  return {
    exported_at: new Date().toISOString(),
    contacts: allContacts,
    companies: allCompanies,
    company_aliases: allCompanyAliases,
    positions: allPositions,
    events: allEvents,
    event_contacts: allEventContacts,
    notes: allNotes,
    facts: allFacts,
    edges: allEdges,
    follow_ups: allFollowUps,
    signals: allSignals,
    card_images: allCardImages,
    voice_vocab: allVoiceVocab,
  };
}
