import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { isAffiliationPredicate, positionRelationFor } from "@dhaga/core";
import type { Relationship } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";
// Deep import (the leaf module, not the contacts barrel) so graph doesn't pull
// the whole contacts repo — and its confirmations/notes imports — back into
// itself; same treatment relationship-rows gives confirmations/create.
import { computePrimaryDenorm } from "@/lib/repo/contacts/primary-position";

export type PositionInsert = typeof positions.$inferInsert;

/**
 * The position (job / degree) an extracted relationship records, or null when
 * it records no role. A relationship becomes a position only when it is an
 * affiliation predicate — a person→company link that is NOT a role
 * (invests_in, customer_of) stays a plain edge.
 *
 * `relation` follows the convention the manual editor and the importer already
 * store (repo/contacts/write.ts positionRows): NULL for plain employment, the
 * predicate itself for anything else, so affiliationPredicate() reads it back.
 * `isCurrent` takes the model's answer; when the note doesn't say, only a
 * present-tense works_at is assumed current — everything else defaults to a
 * past role, which can never displace a user's chosen primary job.
 */
export function buildPositionRow(args: {
  contactId: string;
  companyId: string;
  noteId: string;
  rel: Relationship;
}): PositionInsert | null {
  const { contactId, companyId, noteId, rel } = args;
  if (!isAffiliationPredicate(rel.predicate)) return null;
  return {
    id: randomUUID(),
    contactId,
    companyId,
    title: rel.role_title?.trim() || null,
    relation: positionRelationFor(rel.predicate),
    isCurrent: rel.is_current ?? rel.predicate === "works_at",
    startedAt: rel.started_at?.trim() || null,
    endedAt: rel.ended_at?.trim() || null,
    sourceNoteId: noteId,
  };
}

/**
 * Insert extraction-derived positions, ADDITIVELY. Auto-apply runs with no
 * confirmation step, so AI may only ever ADD: a row already exists for that
 * (contact, company) pair — whoever wrote it — and we skip, so a second note
 * about the same employer neither duplicates the job nor overwrites the title
 * the user typed. Nothing here updates or deletes an existing row.
 *
 * New rows sort AFTER the contact's existing ones so computePrimaryDenorm's
 * "first current, else first" rule keeps a user's own current job primary; the
 * AI row only becomes primary when there was nothing current before it.
 *
 * One transaction: every statement is a pure DB write (no LLM/webhook calls to
 * hold a pooled connection open across — see applyExtraction's note), so the
 * insert and the denormalised title/company_id can't drift apart.
 */
export async function insertPositionRows(rows: PositionInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const contactIds = [...new Set(rows.map((row) => row.contactId))];
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        contactId: positions.contactId,
        companyId: positions.companyId,
        sortOrder: positions.sortOrder,
      })
      .from(positions)
      .where(inArray(positions.contactId, contactIds));
    const taken = new Set(existing.map((row) => `${row.contactId}:${row.companyId}`));
    const lastOrder = new Map<string, number>();
    for (const row of existing) {
      lastOrder.set(row.contactId, Math.max(lastOrder.get(row.contactId) ?? -1, row.sortOrder));
    }
    const fresh: PositionInsert[] = [];
    for (const row of rows) {
      const key = `${row.contactId}:${row.companyId}`;
      if (taken.has(key)) continue;
      taken.add(key); // two relationships naming the same employer collapse to one
      const sortOrder = (lastOrder.get(row.contactId) ?? -1) + 1;
      lastOrder.set(row.contactId, sortOrder);
      fresh.push({ ...row, sortOrder });
    }
    if (fresh.length === 0) return;
    await tx.insert(positions).values(fresh);
    await refreshDenorm(tx, [...new Set(fresh.map((row) => row.contactId))]);
  });
}

/**
 * Drop the positions one note derived, and only those: the WHERE is on
 * `source_note_id`, so a user-entered row (source_note_id IS NULL) is never
 * touched. Positions carry no `deleted_at`, so a deleted note's jobs are hard
 * deleted rather than tombstoned — the receipt they'd point at is gone.
 *
 * Runs on the caller's transaction (clearNoteDerivations / deleteNote), so the
 * removal and the denorm recompute land with the rest of their cascade.
 */
export async function deleteNotePositions(tx: DhagaDb, noteId: string): Promise<void> {
  const affected = await tx
    .select({ contactId: positions.contactId })
    .from(positions)
    .where(eq(positions.sourceNoteId, noteId));
  if (affected.length === 0) return;
  await tx.delete(positions).where(eq(positions.sourceNoteId, noteId));
  await refreshDenorm(tx, [...new Set(affected.map((row) => row.contactId))]);
}

/** Re-mirror contacts.title / company_id from the live positions rows. */
async function refreshDenorm(tx: DhagaDb, contactIds: string[]): Promise<void> {
  for (const contactId of contactIds) {
    const denorm = await computePrimaryDenorm(tx, contactId);
    await tx.update(contacts).set(denorm).where(eq(contacts.id, contactId));
  }
}
