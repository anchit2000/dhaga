import { randomUUID } from "node:crypto";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  companies,
  contacts,
  edges,
  facts,
  followUps,
  notes,
  sessionContacts,
  signals,
} from "@/lib/db/schema";
import { deleteEmbeddingsByContact } from "../embeddings";
import { deleteCardImagesByContact } from "../card-images";
import { emitWebhook } from "@/lib/webhooks";
import type { ExtractedContact } from "@dhaga/core";
import type { ContactSource } from "@/utils/constants/app";

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
 * contact → notes → facts → edges → follow-ups → signals → session links.
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
    await tx.delete(sessionContacts).where(eq(sessionContacts.contactId, id));
    await deleteEmbeddingsByContact(id, tx);
    await tx.delete(contacts).where(eq(contacts.id, id));
  });
}
