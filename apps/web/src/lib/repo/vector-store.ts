import { and, cosineDistance, desc, eq, gt, or, sql } from "drizzle-orm";
import type {
  VectorRecord,
  VectorSearchOptions,
  VectorStore,
  VectorWriteOptions,
} from "@dhaga/core";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  getVectorStore,
  registerVectorStore,
  selectVectorStore,
} from "@dhaga/core";

export { getVectorStore, registerVectorStore, selectVectorStore };
import { getDb } from "@/lib/db/request-scope";
import { embeddings } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

function transaction(options?: VectorWriteOptions): DhagaDb | undefined {
  return options?.transaction as DhagaDb | undefined;
}

export class PgVectorStore implements VectorStore {
  readonly id = "pgvector";
  readonly dimensions = DEFAULT_EMBEDDING_DIMENSIONS;

  async upsert(records: VectorRecord[], options?: VectorWriteOptions): Promise<void> {
    if (records.length === 0) return;
    const db = transaction(options) ?? (await getDb());
    for (const record of records) {
      await db
        .insert(embeddings)
        .values({
          ownerType: record.ownerType,
          ownerId: record.ownerId,
          contactId: record.contactId,
          content: record.content,
          embedding: record.vector,
        })
        .onConflictDoUpdate({
          target: [embeddings.ownerType, embeddings.ownerId],
          set: { content: record.content, embedding: record.vector },
        });
    }
  }

  async search(vector: number[], options: VectorSearchOptions = {}) {
    const db = await getDb();
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, vector)})`;
    return db
      .select({
        contactId: embeddings.contactId,
        content: embeddings.content,
        ownerType: embeddings.ownerType,
        similarity,
      })
      .from(embeddings)
      .where(gt(similarity, options.minimumSimilarity ?? 0.5))
      .orderBy(desc(similarity))
      .limit(options.limit ?? 12);
  }

  async has(ownerType: string, ownerId: string): Promise<boolean> {
    const db = await getDb();
    const row = await db
      .select({ ownerId: embeddings.ownerId })
      .from(embeddings)
      .where(and(eq(embeddings.ownerType, ownerType), eq(embeddings.ownerId, ownerId)))
      .limit(1);
    return row.length > 0;
  }

  async delete(ownerType: string, ownerId: string, options?: VectorWriteOptions): Promise<void> {
    const db = transaction(options) ?? (await getDb());
    await db
      .delete(embeddings)
      .where(and(eq(embeddings.ownerType, ownerType), eq(embeddings.ownerId, ownerId)));
  }

  async deleteMany(
    records: Array<Pick<VectorRecord, "ownerType" | "ownerId">>,
    options?: VectorWriteOptions,
  ): Promise<void> {
    if (records.length === 0) return;
    const db = transaction(options) ?? (await getDb());
    const predicates = records.map((record) =>
      and(eq(embeddings.ownerType, record.ownerType), eq(embeddings.ownerId, record.ownerId)),
    );
    await db.delete(embeddings).where(or(...predicates));
  }

  async deleteByContact(contactId: string, options?: VectorWriteOptions): Promise<void> {
    const db = transaction(options) ?? (await getDb());
    await db.delete(embeddings).where(eq(embeddings.contactId, contactId));
  }
}

registerVectorStore(new PgVectorStore());
