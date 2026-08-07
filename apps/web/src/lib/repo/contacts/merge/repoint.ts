import { and, eq, inArray, sql } from "drizzle-orm";
import {
  cardImages,
  confirmations,
  edges,
  edgeSuggestions,
  embeddings,
  eventContacts,
  extractionJobs,
  facts,
  followUps,
  notes,
  positions,
  signals,
} from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

/** Steps 1-4 of mergeContacts: re-point every table keyed to a source
 *  contact onto the survivor, then de-duplicate the polymorphic edges table. */
export async function repointContactReferences(
  tx: DhagaDb,
  targetId: string,
  sourceIds: string[],
): Promise<void> {
  // 1) Re-point every table keyed to a source contact onto the survivor.
  await tx.update(positions).set({ contactId: targetId }).where(inArray(positions.contactId, sourceIds));
  await tx.update(notes).set({ contactId: targetId }).where(inArray(notes.contactId, sourceIds));
  await tx.update(facts).set({ contactId: targetId }).where(inArray(facts.contactId, sourceIds));
  await tx.update(edgeSuggestions).set({ srcContactId: targetId }).where(inArray(edgeSuggestions.srcContactId, sourceIds));
  await tx.update(followUps).set({ contactId: targetId }).where(inArray(followUps.contactId, sourceIds));
  // extraction_jobs (NOT NULL FK) + confirmations (nullable FK) — not in the
  // forget cascade, but both would abort the final source delete if skipped.
  await tx.update(extractionJobs).set({ contactId: targetId }).where(inArray(extractionJobs.contactId, sourceIds));
  await tx.update(cardImages).set({ contactId: targetId }).where(inArray(cardImages.contactId, sourceIds));
  await tx.update(signals).set({ contactId: targetId }).where(inArray(signals.contactId, sourceIds));
  await tx.update(confirmations).set({ contactId: targetId }).where(inArray(confirmations.contactId, sourceIds));

  // 2) event_contacts PK is (event_id, contact_id): drop source rows that
  // would collide with the survivor's own membership, THEN re-point the rest.
  const targetEventIds = tx
    .select({ eventId: eventContacts.eventId })
    .from(eventContacts)
    .where(eq(eventContacts.contactId, targetId));
  await tx
    .delete(eventContacts)
    .where(and(inArray(eventContacts.contactId, sourceIds), inArray(eventContacts.eventId, targetEventIds)));
  await tx.update(eventContacts).set({ contactId: targetId }).where(inArray(eventContacts.contactId, sourceIds));

  // 3) embeddings PK is (owner_type, owner_id). owner_type='contact' rows are
  // identity vectors keyed BY the contact id, so re-pointing would collide
  // with the survivor's own — drop the sources' identities, re-point the rest
  // (note/fact vectors, whose contact_id is a plain column) onto the survivor.
  await tx
    .delete(embeddings)
    .where(and(eq(embeddings.ownerType, "contact"), inArray(embeddings.ownerId, sourceIds)));
  await tx.update(embeddings).set({ contactId: targetId }).where(inArray(embeddings.contactId, sourceIds));

  // 4) edges are polymorphic (no FK). Re-point contact endpoints, drop the
  // self-edges the merge creates, then de-dup live edges on the survivor.
  await tx.update(edges).set({ srcId: targetId }).where(and(eq(edges.srcType, "contact"), inArray(edges.srcId, sourceIds)));
  await tx.update(edges).set({ dstId: targetId }).where(and(eq(edges.dstType, "contact"), inArray(edges.dstId, sourceIds)));
  await tx
    .delete(edges)
    .where(and(eq(edges.srcType, "contact"), eq(edges.dstType, "contact"), eq(edges.srcId, targetId), eq(edges.dstId, targetId)));
  // Keep one live edge per (src, predicate, dst) — mergeMentionedContact skips
  // this, so folding two people who both "work_at" one company would leave a
  // duplicate. Keeper = lowest id (deterministic); scoped to the survivor so
  // pre-existing duplicates elsewhere are left untouched.
  await tx.execute(sql`
    DELETE FROM edges
    WHERE deleted_at IS NULL
      AND ((src_type = 'contact' AND src_id = ${targetId})
        OR (dst_type = 'contact' AND dst_id = ${targetId}))
      AND id <> (
        SELECT MIN(dup.id) FROM edges dup
        WHERE dup.deleted_at IS NULL
          AND dup.src_type = edges.src_type AND dup.src_id = edges.src_id
          AND dup.predicate = edges.predicate
          AND dup.dst_type = edges.dst_type AND dup.dst_id = edges.dst_id
      )
  `);
}
