import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  contacts,
  edges,
  facts,
  followUps,
  notes,
  eventContacts,
  positions,
  signals,
} from "@/lib/db/schema";
import { deleteEmbeddingsByContact } from "../embeddings";
import { deleteCardImagesByContact } from "../card-images";

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
    // Move any employment onto the surviving contact — lossless (a mentioned
    // stub rarely carries positions, but never silently drop one if it does).
    await tx.update(positions).set({ contactId: targetId }).where(eq(positions.contactId, mentionId));
    await tx.delete(contacts).where(eq(contacts.id, mentionId));
    return true;
  });
}

/**
 * "Forget this person" — hard delete, full cascade (BRD §7.5 / GDPR):
 * contact → notes → facts → edges → follow-ups → positions → signals → event
 * links.
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
          and(eq(edges.dstType, "contact"), eq(edges.dstId, id)),
        ),
      );
    await tx.delete(facts).where(eq(facts.contactId, id));
    await tx.delete(followUps).where(eq(followUps.contactId, id));
    // Employment history — a real FK to contacts.id with no onDelete cascade.
    await tx.delete(positions).where(eq(positions.contactId, id));
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
