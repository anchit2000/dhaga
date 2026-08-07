import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { facts } from "@/lib/db/schema";
import { embedPassages } from "@/lib/ai/embedder";
import type { DhagaDb } from "@/lib/db";
import { assertCompatibleVectorDimensions, getEmbeddingProvider } from "@dhaga/core";
import { getVectorStore } from "../vector-store";

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
