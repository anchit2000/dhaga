import { FirecrawlSearchClient } from "./firecrawl-client";
import type { SearchClient, SearchProvider } from "./types";

export type { SearchClient, SearchOptions, SearchProvider, SearchResult } from "./types";
export { FirecrawlSearchClient } from "./firecrawl-client";

/**
 * Search gateway — mirrors the LLM gateway (../llm/index.ts). This is the
 * only place a concrete web-search provider is chosen. SEARCH_PROVIDER
 * selects the implementation; adding one (Brave, SerpAPI, a self-hosted
 * SearXNG instance…) means a new SearchClient implementation plus a case
 * below — zero changes to callers (Open/Closed, Dependency Inversion).
 */
const providerStore = globalThis as unknown as {
  __dhagaSearchProviders?: Map<string, SearchProvider>;
  __dhagaSearchProviderOverride?: string;
};

function searchProviders(): Map<string, SearchProvider> {
  providerStore.__dhagaSearchProviders ??= new Map();
  const providers = providerStore.__dhagaSearchProviders;
  if (!providers.has("firecrawl")) {
    providers.set("firecrawl", {
      id: "firecrawl",
      isConfigured: () => Boolean(process.env.FIRECRAWL_API_KEY),
      createClient: () => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set — web-search features are unavailable");
        return new FirecrawlSearchClient(apiKey);
      },
    });
  }
  return providers;
}

export function registerSearchProvider(provider: SearchProvider): () => void {
  if (!provider.id.trim()) throw new Error("Search provider id cannot be empty");
  searchProviders().set(provider.id, provider);
  return () => searchProviders().delete(provider.id);
}

export function selectSearchProvider(id: string | null): void {
  providerStore.__dhagaSearchProviderOverride = id ?? undefined;
}

export function getSearchProvider(): SearchProvider {
  const id = providerStore.__dhagaSearchProviderOverride || process.env.SEARCH_PROVIDER || "firecrawl";
  const provider = searchProviders().get(id);
  if (!provider) throw new Error(`Unknown SEARCH_PROVIDER "${id}"`);
  return provider;
}

/** True when a web-search provider is configured; features degrade when not. */
export function hasSearch(): boolean {
  return getSearchProvider().isConfigured();
}

export function getSearchClient(): SearchClient {
  return getSearchProvider().createClient();
}
