import { afterEach, describe, expect, it } from "vitest";
import {
  assertCompatibleVectorDimensions,
  getEmbeddingProvider,
  getSearchClient,
  getVectorStore,
  registerEmbeddingProvider,
  registerSearchProvider,
  registerVectorStore,
  selectEmbeddingProvider,
  selectSearchProvider,
  selectVectorStore,
  type VectorStore,
} from "@dhaga/core";

afterEach(() => {
  selectSearchProvider(null);
  selectEmbeddingProvider(null);
  selectVectorStore(null);
});

describe("external provider registry", () => {
  it("registers a search provider without changing the core gateway", async () => {
    const client = {
      search: async () => [{ title: "Local", url: "https://example.test", snippet: "result" }],
    };
    const unregister = registerSearchProvider({
      id: "test-search",
      isConfigured: () => true,
      createClient: () => client,
    });
    selectSearchProvider("test-search");

    await expect(getSearchClient().search("query")).resolves.toHaveLength(1);
    unregister();
  });

  it("registers compatible embedding and vector providers", () => {
    const embedding = {
      id: "test-embeddings",
      dimensions: 3,
      isConfigured: () => true,
      embedDocuments: async () => [[1, 0, 0]],
      embedQuery: async () => [1, 0, 0],
    };
    const vectorStore: VectorStore = {
      id: "test-vectors",
      dimensions: 3,
      upsert: async () => undefined,
      search: async () => [],
      has: async () => false,
      delete: async () => undefined,
      deleteMany: async () => undefined,
      deleteByContact: async () => undefined,
    };
    const unregisterEmbedding = registerEmbeddingProvider(embedding);
    const unregisterVectors = registerVectorStore(vectorStore);
    selectEmbeddingProvider(embedding.id);
    selectVectorStore(vectorStore.id);

    expect(getEmbeddingProvider()).toBe(embedding);
    expect(getVectorStore()).toBe(vectorStore);
    expect(() => assertCompatibleVectorDimensions(embedding, vectorStore)).not.toThrow();

    unregisterEmbedding();
    unregisterVectors();
  });

  it("fails early when embedding dimensions do not match the vector store", () => {
    expect(() =>
      assertCompatibleVectorDimensions(
        { id: "embedding", dimensions: 768 },
        { id: "vectors", dimensions: 384 },
      ),
    ).toThrow(/768 dimensions/);
  });
});
