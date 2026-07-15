import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, facts, followUps } from "@/lib/db/schema";
import { findOrCreateCompany } from "./contacts";
import { upsertEmbedding } from "./embeddings";
import { emitWebhook } from "@/lib/webhooks";
import type { NoteExtraction, Relationship } from "@dhaga/core";

async function resolvePersonId(name: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(ilike(contacts.name, name.trim()))
    .limit(1);
  return row?.id ?? null;
}

async function resolveOrCreateMentionedPerson(name: string): Promise<string> {
  const existing = await resolvePersonId(name);
  if (existing) return existing;
  const db = await getDb();
  const id = randomUUID();
  await db.insert(contacts).values({
    id,
    name: name.trim(),
    title: null,
    companyId: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
    tags: [],
    source: "mentioned",
  });
  return id;
}

function relationshipAsFactText(rel: Relationship): string {
  return `${rel.predicate.replaceAll("_", " ")} ${rel.object}`;
}

/**
 * Write one note's extraction into the graph. Every row carries
 * source_note_id — deleting the note tombstones all of this.
 * Unknown named people become lightweight `mentioned` contacts. They can
 * participate in the graph without cluttering the main People list.
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
  opts: { unverified?: boolean } = {},
): Promise<void> {
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

  const edgeRows: (typeof edges.$inferInsert)[] = [];

  for (const rel of extraction.relationships) {
    const srcId =
      rel.subject.toLowerCase() === "contact"
        ? contactId
        : ((await resolvePersonId(rel.subject)) ?? contactId);
    const dstId =
      rel.object_type === "company"
        ? await findOrCreateCompany(rel.object)
        : await resolveOrCreateMentionedPerson(rel.object);

    if (dstId) {
      edgeRows.push({
        id: randomUUID(),
        srcType: "contact",
        srcId,
        predicate: rel.predicate,
        dstType: rel.object_type,
        dstId,
        sourceNoteId: noteId,
      });
    } else {
      factRows.push({
        id: randomUUID(),
        contactId,
        type: "personal",
        text: relationshipAsFactText(rel),
        confidence: 0.7,
        unverified,
        sourceNoteId: noteId,
      });
    }
  }

  if (factRows.length > 0) {
    await db.insert(facts).values(factRows);
    for (const row of factRows) {
      await upsertEmbedding("fact", row.id, contactId, row.text);
    }
  }

  if (edgeRows.length > 0) {
    await db.insert(edges).values(edgeRows);
  }

  const followUpRows: (typeof followUps.$inferInsert)[] = extraction.follow_ups.map(
    (followUp) => ({
      id: randomUUID(),
      contactId,
      action: followUp.action,
      dueHint: followUp.due_hint,
      status: "open",
      sourceNoteId: noteId,
    }),
  );

  if (followUpRows.length > 0) {
    await db.insert(followUps).values(followUpRows);
    for (const row of followUpRows) {
      await emitWebhook("followup.created", {
        id: row.id,
        contactId,
        action: row.action,
        dueHint: row.dueHint,
      });
    }
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
}
