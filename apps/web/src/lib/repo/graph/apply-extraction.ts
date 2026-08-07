import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { calendarDayToUtcDate, resolveDatePhrase } from "@dhaga/core";
import { getDb, withTransactionDb } from "@/lib/db/request-scope";
import { contacts, edges, edgeSuggestions, facts, followUps } from "@/lib/db/schema";
import { upsertEmbedding } from "../embeddings";
import { emitWebhook } from "@/lib/webhooks";
import { insertPositionRows } from "./position-rows";
import { buildRelationshipRows } from "./relationship-rows";
import { createFollowUpDateConfirmation } from "@/lib/repo/confirmations/follow-up-date";
import type { CalendarDay, DatePhraseResolution, NoteExtraction } from "@dhaga/core";

/**
 * Write one note's extraction into the graph. Every row carries
 * source_note_id — deleting the note tombstones all of this.
 * Relationship objects resolve per kind in ./relationship-rows: unambiguous
 * ones become edges now — or, for an affiliation to a company, a positions row
 * (a job or a degree) whose edge the graph re-derives — while ambiguous (or
 * unknown-entity) ones become pending confirmations for the user to resolve
 * (no new edge_suggestions rows).
 *
 * Each entity type is written with one multi-row `db.insert(...).values([...])`
 * instead of N single-row inserts in a loop: a single INSERT statement is
 * atomic in Postgres, so a failure partway (e.g. the contact being deleted
 * concurrently, a transient connection blip) can't leave that table
 * half-written while the rest of the extraction silently vanishes. This is
 * deliberately *not* one big `db.transaction(...)` around the whole
 * function — upsertEmbedding() and emitWebhook() make outbound network calls
 * (embedding model, webhook receiver), and holding a DB connection open
 * across those under Supabase's 5-connection pool cap would risk exhausting
 * it. Embeddings/webhooks run after their table's insert has committed, so
 * success-path behavior is unchanged.
 */
export async function applyExtraction(
  contactId: string,
  noteId: string,
  extraction: NoteExtraction,
  opts: { unverified?: boolean; today?: CalendarDay } = {},
): Promise<{ factIds: string[] }> {
  const db = await getDb();
  const unverified = opts.unverified ?? false;

  const factRows: (typeof facts.$inferInsert)[] = extraction.facts.map((fact) => ({
    id: randomUUID(),
    contactId,
    type: fact.type,
    text: fact.text,
    confidence: fact.confidence,
    unverified,
    sourceNoteId: noteId,
  }));

  const { edgeRows, suggestionRows, positionRows } = await buildRelationshipRows(
    contactId,
    noteId,
    extraction.relationships,
  );

  if (factRows.length > 0) {
    await db.insert(facts).values(factRows);
    for (const row of factRows) {
      await upsertEmbedding("fact", row.id, contactId, row.text);
    }
  }

  if (edgeRows.length > 0) {
    await db.insert(edges).values(edgeRows);
  }

  if (suggestionRows.length > 0) {
    await db.insert(edgeSuggestions).values(suggestionRows);
  }

  // Jobs/degrees the note stated. Purely additive — an existing position for
  // that employer (the user's or an earlier note's) is left exactly as it is.
  await insertPositionRows(positionRows);

  const datedFollowUps = extraction.follow_ups.map((followUp) => {
    const resolution: DatePhraseResolution = opts.today
      ? resolveDatePhrase(followUp.due_hint, opts.today)
      : { kind: "unresolved" };
    return {
      resolution,
      row: {
        id: randomUUID(),
        contactId,
        action: followUp.action,
        dueHint: followUp.due_hint,
        dueDate: resolution.kind === "unresolved" ? null : calendarDayToUtcDate(resolution.date),
        status: "open",
        sourceNoteId: noteId,
      } satisfies typeof followUps.$inferInsert,
    };
  });
  const followUpRows = datedFollowUps.map(({ row }) => row);

  if (followUpRows.length > 0) {
    const ambiguous = datedFollowUps.filter(({ resolution }) => resolution.kind === "ambiguous");
    if (ambiguous.length === 0) {
      await db.insert(followUps).values(followUpRows);
    } else {
      await db.transaction((tx) => withTransactionDb(tx, async () => {
        await tx.insert(followUps).values(followUpRows);
        for (const { row, resolution } of ambiguous) {
          if (resolution.kind !== "ambiguous") continue;
          const alternative = resolution.alternatives.at(-1) ?? resolution.date;
          await createFollowUpDateConfirmation({
            followUpId: row.id,
            action: row.action,
            scheduledDate: calendarDayToUtcDate(resolution.date).toISOString().slice(0, 10),
            alternativeDate: calendarDayToUtcDate(alternative).toISOString().slice(0, 10),
            sourceNoteId: noteId,
            contactId,
          });
        }
      }));
    }
    for (const { row } of datedFollowUps) await emitWebhook("followup.created", {
      id: row.id,
      contactId,
      action: row.action,
      dueHint: row.dueHint,
    });
  }

  if (extraction.tags.length > 0) {
    const [row] = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);
    const merged = [...new Set([...(row?.tags ?? []), ...extraction.tags])];
    await db.update(contacts).set({ tags: merged }).where(eq(contacts.id, contactId));
  }

  // Fact ids in extraction.facts order, so enrichment can raise one
  // enrichment_match confirmation per unverified fact it just wrote.
  return { factIds: factRows.map((row) => row.id) };
}
