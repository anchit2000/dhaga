import type { EmbeddingProvider, VectorStore } from "./types";

export const DEFAULT_EMBEDDING_DIMENSIONS = 384;

export {
  assertCompatibleVectorDimensions,
  type EmbeddingProvider,
  type VectorHit,
  type VectorRecord,
  type VectorSearchOptions,
  type VectorStore,
  type VectorWriteOptions,
} from "./types";

const store = globalThis as unknown as {
  __dhagaEmbeddingProviders?: Map<string, EmbeddingProvider>;
  __dhagaEmbeddingProviderOverride?: string;
  __dhagaVectorStores?: Map<string, VectorStore>;
  __dhagaVectorStoreOverride?: string;
};

export function registerEmbeddingProvider(provider: EmbeddingProvider): () => void {
  if (!provider.id.trim()) throw new Error("Embedding provider id cannot be empty");
  if (!Number.isInteger(provider.dimensions) || provider.dimensions <= 0) {
    throw new Error(`Embedding provider "${provider.id}" has invalid dimensions`);
  }
  store.__dhagaEmbeddingProviders ??= new Map();
  store.__dhagaEmbeddingProviders.set(provider.id, provider);
  return () => store.__dhagaEmbeddingProviders?.delete(provider.id);
}

export function selectEmbeddingProvider(id: string | null): void {
  store.__dhagaEmbeddingProviderOverride = id ?? undefined;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const id = store.__dhagaEmbeddingProviderOverride || process.env.DHAGA_EMBEDDING_PROVIDER || "local-huggingface";
  const provider = store.__dhagaEmbeddingProviders?.get(id);
  if (!provider) throw new Error(`Unknown DHAGA_EMBEDDING_PROVIDER "${id}"`);
  return provider;
}

export function registerVectorStore(vectorStore: VectorStore): () => void {
  if (!vectorStore.id.trim()) throw new Error("Vector store id cannot be empty");
  if (!Number.isInteger(vectorStore.dimensions) || vectorStore.dimensions <= 0) {
    throw new Error(`Vector store "${vectorStore.id}" has invalid dimensions`);
  }
  store.__dhagaVectorStores ??= new Map();
  store.__dhagaVectorStores.set(vectorStore.id, vectorStore);
  return () => store.__dhagaVectorStores?.delete(vectorStore.id);
}

export function selectVectorStore(id: string | null): void {
  store.__dhagaVectorStoreOverride = id ?? undefined;
}

export function getVectorStore(): VectorStore {
  const id = store.__dhagaVectorStoreOverride || process.env.DHAGA_VECTOR_STORE || "pgvector";
  const vectorStore = store.__dhagaVectorStores?.get(id);
  if (!vectorStore) throw new Error(`Unknown DHAGA_VECTOR_STORE "${id}"`);
  return vectorStore;
}
