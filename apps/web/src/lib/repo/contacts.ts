import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  companies,
  contacts,
  edges,
  facts,
  followUps,
  notes,
  sessionContacts,
  type ContactRow,
} from "@/lib/db/schema";
import { deleteEmbeddingsByContact } from "./embeddings";
import { deleteCardImagesByContact } from "./card-images";
import { emitWebhook } from "@/lib/webhooks";
import type { ExtractedContact } from "@dhaga/core";
import type { ContactSource } from "@/utils/constants/app";

export interface ContactListItem {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  createdAt: Date;
}

export interface ContactDetail {
  contact: ContactRow;
  companyName: string | null;
}

export async function listContacts(
  query?: string,
  tag?: string,
): Promise<ContactListItem[]> {
  const db = await getDb();
  const like = query?.trim() ? `%${query.trim()}%` : null;
  const conditions = [
    like
      ? or(
          ilike(contacts.name, like),
          ilike(contacts.title, like),
          ilike(companies.name, like),
        )
      : undefined,
    tag?.trim()
      ? sql`${contacts.tags} @> ${JSON.stringify([tag.trim()])}::jsonb`
      : undefined,
  ].filter((condition) => condition !== undefined);
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contacts.createdAt));
}

/** Distinct tags across all contacts (extraction writes them lowercase). */
export async function listAllTags(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ tags: contacts.tags }).from(contacts);
  return [...new Set(rows.flatMap((row) => row.tags))].sort();
}

export async function getContact(id: string): Promise<ContactDetail | null> {
  const db = await getDb();
  const [row] = await db
    .select({ contact: contacts, companyName: companies.name })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, id))
    .limit(1);
  return row ?? null;
}

export async function findOrCreateCompany(name: string): Promise<string> {
  const db = await getDb();
  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(ilike(companies.name, trimmed))
    .limit(1);
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(companies).values({ id, name: trimmed });
  return id;
}

export async function createContact(
  input: ExtractedContact,
  source: ContactSource,
): Promise<string> {
  const db = await getDb();
  const companyId = input.company?.trim()
    ? await findOrCreateCompany(input.company)
    : null;
  const id = randomUUID();
  await db.insert(contacts).values({
    id,
    name: input.name.trim(),
    title: input.title?.trim() || null,
    companyId,
    emails: input.emails,
    phones: input.phones,
    links: input.links,
    location: input.location?.trim() || null,
    tags: [],
    source,
  });
  // Single choke point for all capture surfaces — the natural webhook spot.
  await emitWebhook("contact.created", { id, name: input.name.trim(), source });
  return id;
}

/**
 * "Forget this person" — hard delete, full cascade (BRD §7.5 / GDPR):
 * contact → notes → facts → edges → follow-ups → session links.
 */
export async function forgetContact(id: string): Promise<void> {
  const db = await getDb();
  // Rows derived from this contact's notes can reference other contacts —
  // remove by source note first so no receipt outlives its note.
  const noteIds = (
    await db.select({ id: notes.id }).from(notes).where(eq(notes.contactId, id))
  ).map((row) => row.id);
  if (noteIds.length > 0) {
    await db.delete(edges).where(inArray(edges.sourceNoteId, noteIds));
    await db.delete(facts).where(inArray(facts.sourceNoteId, noteIds));
    await db.delete(followUps).where(inArray(followUps.sourceNoteId, noteIds));
  }
  await db
    .delete(edges)
    .where(
      or(
        and(eq(edges.srcType, "contact"), eq(edges.srcId, id)),
        and(eq(edges.dstType, "person"), eq(edges.dstId, id)),
      ),
    );
  await db.delete(facts).where(eq(facts.contactId, id));
  await db.delete(followUps).where(eq(followUps.contactId, id));
  await deleteCardImagesByContact(id); // before notes — card_images FK note_id
  await db.delete(notes).where(eq(notes.contactId, id));
  await db.delete(sessionContacts).where(eq(sessionContacts.contactId, id));
  await deleteEmbeddingsByContact(id);
  await db.delete(contacts).where(eq(contacts.id, id));
}
