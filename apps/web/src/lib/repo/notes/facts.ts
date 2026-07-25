import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { facts, notes, type FactRow } from "@/lib/db/schema";
import { deleteEmbedding } from "@/lib/repo/embeddings";

export interface FactWithReceipt extends FactRow {
  noteCreatedAt: Date | null;
}

export async function listFacts(contactId: string): Promise<FactWithReceipt[]> {
  const db = await getDb();
  const rows = await db
    .select({ fact: facts, noteCreatedAt: notes.createdAt })
    .from(facts)
    .leftJoin(notes, eq(facts.sourceNoteId, notes.id))
    .where(and(eq(facts.contactId, contactId), isNull(facts.deletedAt)))
    .orderBy(desc(facts.createdAt));
  return rows.map((row) => ({ ...row.fact, noteCreatedAt: row.noteCreatedAt }));
}

export async function updateFactText(
  factId: string,
  text: string,
): Promise<void> {
  const db = await getDb();
  await db.update(facts).set({ text: text.trim() }).where(eq(facts.id, factId));
}

/** Clear the "unverified" badge once the user confirms a web-sourced fact. */
export async function verifyFact(factId: string): Promise<void> {
  const db = await getDb();
  await db.update(facts).set({ unverified: false }).where(eq(facts.id, factId));
}

/**
 * Tombstone a fact. Its embedding goes too — same receipts invariant as
 * deleteNote, and the same reason it's transactional: if the fact update
 * succeeded but deleteEmbedding threw, the fact would be gone everywhere
 * else yet still fully searchable.
 */
export async function deleteFact(factId: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(facts).set({ deletedAt: new Date() }).where(eq(facts.id, factId));
    await deleteEmbedding("fact", factId, tx);
  });
}
