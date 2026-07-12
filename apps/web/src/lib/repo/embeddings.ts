import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { facts, notes } from "@/lib/db/schema";
import { embedPassages, embedQuery } from "@/lib/ai/embedder";
import type { DhagaDb } from "@/lib/db";
import { assertCompatibleVectorDimensions, getEmbeddingProvider } from "@dhaga/core";
import { getVectorStore } from "./vector-store";

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
  const vectorStore = getVectorStore();
  assertCompatibleVectorDimensions(getEmbeddingProvider(), vectorStore);
  await vectorStore.upsert([
    { ownerType, ownerId, contactId, content, vector: vectors[0] },
  ]);
}

/** Pass `conn` (e.g. a transaction) so callers like deleteFact can keep
 *  this delete inside their own atomic cascade instead of a separate connection. */
export async function deleteEmbedding(
  ownerType: EmbeddingOwner,
  ownerId: string,
  conn?: DhagaDb,
): Promise<void> {
  await getVectorStore().delete(ownerType, ownerId, { transaction: conn });
}

/** Pass `conn` (e.g. a transaction) so callers like forgetContact can keep
 *  this delete inside their own atomic cascade instead of a separate connection. */
export async function deleteEmbeddingsByContact(
  contactId: string,
  conn?: DhagaDb,
): Promise<void> {
  await getVectorStore().deleteByContact(contactId, { transaction: conn });
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
  const vectorStore = getVectorStore();
  if (queryVector.length !== vectorStore.dimensions) {
    throw new Error(
      `Query embedding has ${queryVector.length} dimensions, but vector store ` +
        `"${vectorStore.id}" expects ${vectorStore.dimensions}`,
    );
  }
  return vectorStore.search(queryVector, { limit, minimumSimilarity: 0.5 });
}

/** How many indexable rows have no embedding yet (for the backfill button). */
export async function countUnindexed(): Promise<number> {
  const db = await getDb();
  const [noteRows, factRows] = await Promise.all([
    db
      .select({ id: notes.id })
      .from(notes)
      .where(isNull(notes.deletedAt)),
    db
      .select({ id: facts.id })
      .from(facts)
      .where(isNull(facts.deletedAt)),
  ]);
  const vectorStore = getVectorStore();
  const indexed = await Promise.all([
    ...noteRows.map((row) => vectorStore.has("note", row.id)),
    ...factRows.map((row) => vectorStore.has("fact", row.id)),
  ]);
  return indexed.filter((value) => !value).length;
}

const indexingStore = globalThis as unknown as { __dhagaIndexing?: boolean };

/**
 * Background auto-backfill: new rows are embedded at write time, so this
 * only ever catches pre-existing data. Idempotent; one run at a time.
 */
export async function ensureIndexed(): Promise<void> {
  if (indexingStore.__dhagaIndexing) return;
  indexingStore.__dhagaIndexing = true;
  try {
    await backfillEmbeddings();
  } finally {
    indexingStore.__dhagaIndexing = false;
  }
}

/** Index everything missing. Returns how many rows were embedded. */
export async function backfillEmbeddings(): Promise<number> {
  const db = await getDb();
  const [noteRows, factRows] = await Promise.all([
    db
      .select({ id: notes.id, contactId: notes.contactId, body: notes.body })
      .from(notes)
      .where(isNull(notes.deletedAt)),
    db
      .select({ id: facts.id, contactId: facts.contactId, text: facts.text })
      .from(facts)
      .where(isNull(facts.deletedAt)),
  ]);
  const vectorStore = getVectorStore();
  let count = 0;
  for (const note of noteRows) {
    if (await vectorStore.has("note", note.id)) continue;
    await upsertEmbedding("note", note.id, note.contactId, note.body);
    count += 1;
  }
  for (const fact of factRows) {
    if (await vectorStore.has("fact", fact.id)) continue;
    await upsertEmbedding("fact", fact.id, fact.contactId, fact.text);
    count += 1;
  }
  return count;
}

/** Remove embeddings for a note and everything derived from it.
 *  Pass `conn` (e.g. a transaction) so callers like deleteNote can keep
 *  this delete inside their own atomic cascade instead of a separate connection. */
export async function deleteEmbeddingsForNote(noteId: string, conn?: DhagaDb): Promise<void> {
  const db = conn ?? (await getDb());
  const derivedFacts = await db
    .select({ id: facts.id })
    .from(facts)
    .where(eq(facts.sourceNoteId, noteId));
  await getVectorStore().deleteMany(
    [
      { ownerType: "note", ownerId: noteId },
      ...derivedFacts.map((fact) => ({ ownerType: "fact", ownerId: fact.id })),
    ],
    { transaction: db },
  );
}
