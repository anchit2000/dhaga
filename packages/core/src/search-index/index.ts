import type { SearchIndex } from "./types";

export {
  type SearchDocument,
  type SearchIndex,
  type SearchIndexResult,
  type SearchKind,
  type SearchQuery,
  type SearchWeights,
  type SearchWriteOptions,
} from "./types";

/**
 * Search-index gateway — mirrors the retrieval gateway (../retrieval/index.ts)
 * and the LLM/web-search gateways. This is the only place a concrete in-app
 * search provider is chosen. SEARCH_INDEX_PROVIDER selects the implementation
 * (default "postgres"); adding one (Elasticsearch, Typesense…) means a new
 * SearchIndex implementation registered under its own id — zero changes to
 * callers.
 */
const store = globalThis as unknown as {
  __dhagaSearchIndexes?: Map<string, SearchIndex>;
  __dhagaSearchIndexOverride?: string;
};

export function registerSearchIndex(index: SearchIndex): () => void {
  if (!index.id.trim()) throw new Error("Search index id cannot be empty");
  store.__dhagaSearchIndexes ??= new Map();
  store.__dhagaSearchIndexes.set(index.id, index);
  return () => store.__dhagaSearchIndexes?.delete(index.id);
}

export function selectSearchIndex(id: string | null): void {
  store.__dhagaSearchIndexOverride = id ?? undefined;
}

export function getSearchIndex(): SearchIndex {
  const id = store.__dhagaSearchIndexOverride || process.env.SEARCH_INDEX_PROVIDER || "postgres";
  const index = store.__dhagaSearchIndexes?.get(id);
  if (!index) throw new Error(`Unknown SEARCH_INDEX_PROVIDER "${id}"`);
  return index;
}
