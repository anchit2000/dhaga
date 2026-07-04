import { FirecrawlSearchClient } from "./firecrawl-client";
import type { SearchClient } from "./types";

export type { SearchClient, SearchOptions, SearchResult } from "./types";
export { FirecrawlSearchClient } from "./firecrawl-client";

/**
 * Search gateway — mirrors the LLM gateway (../llm/index.ts). This is the
 * only place a concrete web-search provider is chosen. SEARCH_PROVIDER
 * selects the implementation; adding one (Brave, SerpAPI, a self-hosted
 * SearXNG instance…) means a new SearchClient implementation plus a case
 * below — zero changes to callers (Open/Closed, Dependency Inversion).
 */
function searchApiKey(): string | null {
  const provider = process.env.SEARCH_PROVIDER ?? "firecrawl";
  if (provider === "firecrawl") return process.env.FIRECRAWL_API_KEY ?? null;
  return null;
}

/** True when a web-search provider is configured; features degrade when not. */
export function hasSearch(): boolean {
  return searchApiKey() !== null;
}

export function getSearchClient(): SearchClient {
  const provider = process.env.SEARCH_PROVIDER ?? "firecrawl";
  switch (provider) {
    case "firecrawl": {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        throw new Error(
          "FIRECRAWL_API_KEY is not set — web-search features are unavailable",
        );
      }
      return new FirecrawlSearchClient(apiKey);
    }
    default:
      throw new Error(`Unknown SEARCH_PROVIDER "${provider}"`);
  }
}
