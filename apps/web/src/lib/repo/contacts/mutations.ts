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
  eventContacts,
  signals,
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
  const mentionedMatches = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.source, "mentioned"),
        ilike(contacts.name, input.name.trim()),
      ),
    )
    .limit(2);
  const id = mentionedMatches.length === 1 ? mentionedMatches[0].id : randomUUID();
  const values = {
    name: input.name.trim(),
    title: input.title?.trim() || null,
    companyId,
    emails: input.emails,
    phones: input.phones,
    links: input.links,
    location: input.location?.trim() || null,
    source,
    updatedAt: new Date(),
  };
  if (mentionedMatches.length === 1) {
    await db.update(contacts).set(values).where(eq(contacts.id, id));
  } else {
    await db.insert(contacts).values({
      id,
      ...values,
      tags: [],
    });
  }
  // Single choke point for all capture surfaces — the natural webhook spot.
  if (!options?.skipWebhook) {
    await emitWebhook("contact.created", { id, name: input.name.trim(), source });
  }
  return id;
}

export async function promoteMentionedContact(id: string): Promise<boolean> {
  const db = await getDb();
  const updated = await db
    .update(contacts)
    .set({ source: "manual", updatedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.source, "mentioned")))
    .returning({ id: contacts.id });
  return updated.length === 1;
}

export async function mergeMentionedContact(
  mentionId: string,
  targetId: string,
): Promise<boolean> {
  if (mentionId === targetId) return false;
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [mention] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, mentionId), eq(contacts.source, "mentioned")))
      .limit(1);
    const [target] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, targetId), sql`${contacts.source} <> 'mentioned'`))
      .limit(1);
    if (!mention || !target) return false;
    await tx.update(edges).set({ srcId: targetId }).where(eq(edges.srcId, mentionId));
    await tx.update(edges).set({ dstId: targetId }).where(eq(edges.dstId, mentionId));
    await tx
      .delete(edges)
      .where(and(eq(edges.srcId, targetId), eq(edges.dstId, targetId)));
    await tx.delete(contacts).where(eq(contacts.id, mentionId));
    return true;
  });
}

/**
 * "Forget this person" — hard delete, full cascade (BRD §7.5 / GDPR):
 * contact → notes → facts → edges → follow-ups → signals → event links.
 *
 * Wrapped in one transaction: every statement here is a pure DB delete (no
 * outbound network calls, so no connection-pool-exhaustion risk from holding
 * it open). Without this, a failure partway through — e.g. a contact-
 * referencing table this function forgot to clean up — leaves a corrupted
 * half-deleted contact behind: notes/facts already gone, but the contact row
 * and whatever still references it remain, permanently unable to finish
 * being forgotten *or* to be used normally. All-or-nothing closes that gap.
 */
export async function forgetContact(id: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    // Rows derived from this contact's notes can reference other contacts —
    // remove by source note first so no receipt outlives its note.
    const noteIds = (
      await tx.select({ id: notes.id }).from(notes).where(eq(notes.contactId, id))
    ).map((row) => row.id);
    if (noteIds.length > 0) {
      await tx.delete(edges).where(inArray(edges.sourceNoteId, noteIds));
      await tx.delete(facts).where(inArray(facts.sourceNoteId, noteIds));
      await tx.delete(followUps).where(inArray(followUps.sourceNoteId, noteIds));
    }
    await tx
      .delete(edges)
      .where(
        or(
          and(eq(edges.srcType, "contact"), eq(edges.srcId, id)),
          and(eq(edges.dstType, "person"), eq(edges.dstId, id)),
        ),
      );
    await tx.delete(facts).where(eq(facts.contactId, id));
    await tx.delete(followUps).where(eq(followUps.contactId, id));
    // Watchlist hits (BRD §6.7) — a real FK to contacts.id with no
    // onDelete: cascade, so this must run before the final contacts delete.
    await tx.delete(signals).where(eq(signals.contactId, id));
    await deleteCardImagesByContact(id, tx); // before notes — card_images FK note_id
    await tx.delete(notes).where(eq(notes.contactId, id));
    await tx.delete(eventContacts).where(eq(eventContacts.contactId, id));
    await deleteEmbeddingsByContact(id, tx);
    await tx.delete(contacts).where(eq(contacts.id, id));
  });
}
