import { and, cosineDistance, desc, eq, gt, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { embeddings, facts, notes } from "@/lib/db/schema";
import { embedPassages, embedQuery } from "@/lib/ai/embedder";

export type EmbeddingOwner = "note" | "fact" | "contact";

/** Fire-and-tolerate: indexing failures never break the user's write. */
export async function upsertEmbedding(
  ownerType: EmbeddingOwner,
  ownerId: string,
  contactId: string,
  content: string,
): Promise<void> {
  const vectors = await embedPassages([content]);
  if (!vectors) return;
  const db = await getDb();
  await db
    .insert(embeddings)
    .values({ ownerType, ownerId, contactId, content, embedding: vectors[0] })
    .onConflictDoUpdate({
      target: [embeddings.ownerType, embeddings.ownerId],
      set: { content, embedding: vectors[0] },
    });
}

export async function deleteEmbedding(
  ownerType: EmbeddingOwner,
  ownerId: string,
): Promise<void> {
  const db = await getDb();
  await db
    .delete(embeddings)
    .where(and(eq(embeddings.ownerType, ownerType), eq(embeddings.ownerId, ownerId)));
}

export async function deleteEmbeddingsByContact(contactId: string): Promise<void> {
  const db = await getDb();
  await db.delete(embeddings).where(eq(embeddings.contactId, contactId));
}

export interface SemanticHit {
  contactId: string;
  content: string;
  ownerType: string;
  similarity: number;
}

export async function semanticSearch(
  query: string,
  limit = 12,
): Promise<SemanticHit[]> {
  const queryVector = await embedQuery(query);
  if (!queryVector) return [];
  const db = await getDb();
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryVector)})`;
  return db
    .select({
      contactId: embeddings.contactId,
      content: embeddings.content,
      ownerType: embeddings.ownerType,
      similarity,
    })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy(desc(similarity))
    .limit(limit);
}

/** How many indexable rows have no embedding yet (for the backfill button). */
export async function countUnindexed(): Promise<number> {
  const db = await getDb();
  const indexed = db.select({ id: embeddings.ownerId }).from(embeddings);
  const [noteRows, factRows] = await Promise.all([
    db
      .select({ id: notes.id })
      .from(notes)
      .where(and(isNull(notes.deletedAt), notInArray(notes.id, indexed))),
    db
      .select({ id: facts.id })
      .from(facts)
      .where(and(isNull(facts.deletedAt), notInArray(facts.id, indexed))),
  ]);
  return noteRows.length + factRows.length;
}

/** Index everything missing. Returns how many rows were embedded. */
export async function backfillEmbeddings(): Promise<number> {
  const db = await getDb();
  const indexed = db.select({ id: embeddings.ownerId }).from(embeddings);
  const [noteRows, factRows] = await Promise.all([
    db
      .select({ id: notes.id, contactId: notes.contactId, body: notes.body })
      .from(notes)
      .where(and(isNull(notes.deletedAt), notInArray(notes.id, indexed))),
    db
      .select({ id: facts.id, contactId: facts.contactId, text: facts.text })
      .from(facts)
      .where(and(isNull(facts.deletedAt), notInArray(facts.id, indexed))),
  ]);
  let count = 0;
  for (const note of noteRows) {
    await upsertEmbedding("note", note.id, note.contactId, note.body);
    count += 1;
  }
  for (const fact of factRows) {
    await upsertEmbedding("fact", fact.id, fact.contactId, fact.text);
    count += 1;
  }
  return count;
}

/** Remove embeddings for a note and everything derived from it. */
export async function deleteEmbeddingsForNote(noteId: string): Promise<void> {
  const db = await getDb();
  const derivedFacts = await db
    .select({ id: facts.id })
    .from(facts)
    .where(eq(facts.sourceNoteId, noteId));
  const ids = [noteId, ...derivedFacts.map((fact) => fact.id)];
  await db.delete(embeddings).where(inArray(embeddings.ownerId, ids));
}
