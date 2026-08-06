import { isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { facts, notes } from "@/lib/db/schema";
import { getVectorStore } from "../vector-store";
import { upsertEmbedding } from "./mutations";

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
    // Entity notes have no contact; embeddings are contact-keyed, so skip.
    if (!note.contactId) continue;
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
