import { randomUUID } from "node:crypto";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  companies,
  contacts,
  edges,
  facts,
  followUps,
  notes,
  sessionContacts,
} from "@/lib/db/schema";
import { deleteEmbeddingsByContact } from "../embeddings";
import { deleteCardImagesByContact } from "../card-images";
import { emitWebhook } from "@/lib/webhooks";
import type { ExtractedContact } from "@dhaga/core";
import type { ContactSource } from "@/utils/constants/app";

/**
 * Two concurrent callers naming the same company (two note extractions, or
 * a CSV import processing repeated employer names) must not race the
 * select-then-insert below into creating duplicate company rows. There's no
 * unique constraint on companies.name to fall back on with ON CONFLICT — DDL
 * runs idempotently on every boot (lib/db/ddl/core.ts), and adding one would
 * fail on any self-hosted install that already has duplicate names. Instead,
 * take a transaction-scoped Postgres advisory lock keyed on the
 * case-insensitive name: it serializes concurrent calls for the SAME name
 * (the second blocks until the first's transaction commits, then its own
 * SELECT sees the row the first just inserted) without touching the schema.
 */
export async function findOrCreateCompany(name: string): Promise<string> {
  const db = await getDb();
  const trimmed = name.trim();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${trimmed.toLowerCase()}))`,
    );
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(ilike(companies.name, trimmed))
      .limit(1);
    if (existing) return existing.id;
    const id = randomUUID();
    await tx.insert(companies).values({ id, name: trimmed });
    return id;
  });
}

export async function createContact(
  input: ExtractedContact,
  source: ContactSource,
  // skipWebhook: bulk import must not fire one POST per row; the import
  // path emits a single contacts.imported event instead (repo/import.ts).
  options?: { skipWebhook?: boolean },
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
  if (!options?.skipWebhook) {
    await emitWebhook("contact.created", { id, name: input.name.trim(), source });
  }
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
