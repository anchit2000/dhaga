import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  cardImages,
  confirmations,
  contacts,
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
import { PreconditionError } from "@/lib/repo/errors";
import type { ContactMergeResolution } from "@dhaga/core";
import { computePrimaryDenorm } from "./primary-position";
import { unionByValue, unionMethods, unionTags } from "./merge-fields";

/**
 * Fold every `sourceIds` contact into `targetId`, in ONE transaction (pure DB —
 * no network/LLM, so holding the connection is safe). The whole game is
 * re-pointing every table that references a contact onto the survivor — mirror
 * of forgetContact's cascade list plus extraction_jobs/confirmations, which
 * both FK contacts.id but predate that cascade — then merging the surviving
 * row's own fields and hard-deleting the sources. All-or-nothing: a failure
 * anywhere rolls back, so a merge can never half-apply and strand rows pointing
 * at a deleted contact.
 */
export async function mergeContacts(
  resolution: ContactMergeResolution,
): Promise<{ targetId: string }> {
  const { targetId } = resolution;
  if (resolution.sourceIds.includes(targetId)) {
    throw new PreconditionError("A contact can't be merged into itself.");
  }
  const sourceIds = [...new Set(resolution.sourceIds)];
  const allIds = [targetId, ...sourceIds];
  const db = await getDb();
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(contacts).where(inArray(contacts.id, allIds));
    // RLS scopes to the user, so a mismatched or deleted id simply isn't found.
    if (rows.length !== allIds.length) {
      throw new PreconditionError("Contact not found — refresh and try again.");
    }
    const byId = new Map(rows.map((row) => [row.id, row]));
    const target = byId.get(targetId)!;
    const sourceRows = sourceIds.map((id) => byId.get(id)!);

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

    // 5) Merge the survivor's own row: user-resolved scalars, unioned
    // multi-value fields, OR-ed flags, cadence, and denorm recomputed from the
    // now-merged positions.
    const denorm = await computePrimaryDenorm(tx, targetId);
    const allRows = [target, ...sourceRows];
    const lastReachedOutAt =
      allRows
        .map((row) => row.lastReachedOutAt)
        .filter((date): date is Date => date != null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    await tx
      .update(contacts)
      .set({
        name: resolution.name.trim(),
        nickname: resolution.nickname?.trim() || null,
        location: resolution.location?.trim() || null,
        emails: unionMethods(allRows.map((row) => row.emails)),
        phones: unionMethods(allRows.map((row) => row.phones)),
        links: unionMethods(allRows.map((row) => row.links)),
        addresses: unionByValue(allRows.map((row) => row.addresses)),
        importantDates: unionByValue(allRows.map((row) => row.importantDates)),
        customFields: unionByValue(allRows.map((row) => row.customFields)),
        tags: unionTags(allRows.map((row) => row.tags)),
        starred: allRows.some((row) => row.starred),
        watchedForSignals: allRows.some((row) => row.watchedForSignals),
        reachOutEveryDays:
          target.reachOutEveryDays ??
          sourceRows.find((row) => row.reachOutEveryDays != null)?.reachOutEveryDays ??
          null,
        lastReachedOutAt,
        title: denorm.title,
        companyId: denorm.companyId,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, targetId));

    // 6) Sources are stripped of every reference — hard-delete them.
    await tx.delete(contacts).where(inArray(contacts.id, sourceIds));
  });
  return { targetId };
}
