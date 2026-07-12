export interface EmbeddingProvider {
  id: string;
  dimensions: number;
  isConfigured(): boolean;
  embedDocuments(texts: string[]): Promise<number[][] | null>;
  embedQuery(text: string): Promise<number[] | null>;
}

export interface VectorRecord {
  ownerType: string;
  ownerId: string;
  contactId: string;
  content: string;
  vector: number[];
}

export interface VectorHit {
  contactId: string;
  content: string;
  ownerType: string;
  similarity: number;
}

export interface VectorSearchOptions {
  limit?: number;
  minimumSimilarity?: number;
}

export interface VectorWriteOptions {
  /** Store-specific transaction/session handle supplied by an owning repository. */
  transaction?: unknown;
}

export interface VectorStore {
  id: string;
  dimensions: number;
  upsert(records: VectorRecord[], options?: VectorWriteOptions): Promise<void>;
  search(vector: number[], options?: VectorSearchOptions): Promise<VectorHit[]>;
  has(ownerType: string, ownerId: string): Promise<boolean>;
  delete(ownerType: string, ownerId: string, options?: VectorWriteOptions): Promise<void>;
  deleteMany(records: Array<Pick<VectorRecord, "ownerType" | "ownerId">>, options?: VectorWriteOptions): Promise<void>;
  deleteByContact(contactId: string, options?: VectorWriteOptions): Promise<void>;
}

export function assertCompatibleVectorDimensions(
  embeddings: Pick<EmbeddingProvider, "id" | "dimensions">,
  vectors: Pick<VectorStore, "id" | "dimensions">,
): void {
  if (embeddings.dimensions !== vectors.dimensions) {
    throw new Error(
      `Embedding provider "${embeddings.id}" produces ${embeddings.dimensions} dimensions, ` +
        `but vector store "${vectors.id}" expects ${vectors.dimensions}`,
    );
  }
}
