import { AnthropicSearchClient } from "./anthropic-client";
import { FirecrawlSearchClient } from "./firecrawl-client";
import type { SearchClient, SearchProvider } from "./types";

export type {
  MeteredSearchClient,
  SearchClient,
  SearchOptions,
  SearchProvider,
  SearchResponse,
  SearchResult,
  SearchUsage,
} from "./types";
export { isMeteredSearchClient } from "./types";
export { AnthropicSearchClient } from "./anthropic-client";
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
  if (!providers.has("anthropic")) {
    providers.set("anthropic", {
      id: "anthropic",
      isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
      createClient: () => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — web-search features are unavailable");
        return new AnthropicSearchClient(apiKey);
      },
    });
  }
  return providers;
}

/**
 * Which provider to use when SEARCH_PROVIDER says nothing. PRECEDENCE, most
 * specific first: an explicit `selectSearchProvider()` (the test hook), then
 * `SEARCH_PROVIDER`, then this.
 *
 * Firecrawl stays the default ONLY where its key is actually set, so an existing
 * self-host that configured it keeps its provider with no config change and no
 * surprise switch to a metered one. Everywhere else the default is Anthropic —
 * the hosted instance never had a Firecrawl subscription, and web search on the
 * key the product already requires is what makes hasSearch() true there.
 *
 * With neither key set the answer is still "anthropic": hasSearch() is false
 * either way, and this way the error a caller eventually sees names
 * ANTHROPIC_API_KEY — the key that would actually fix it.
 */
function defaultSearchProviderId(): string {
  return process.env.FIRECRAWL_API_KEY ? "firecrawl" : "anthropic";
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
  const id =
    providerStore.__dhagaSearchProviderOverride ||
    process.env.SEARCH_PROVIDER ||
    defaultSearchProviderId();
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
