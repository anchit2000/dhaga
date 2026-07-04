import type { SearchClient, SearchOptions, SearchResult } from "./types";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";

interface FirecrawlWebResult {
  url?: string;
  title?: string;
  description?: string;
}

interface FirecrawlSearchResponse {
  data?: FirecrawlWebResult[] | { web?: FirecrawlWebResult[] };
}

/**
 * Default SearchClient (see ./types.ts): Firecrawl's hosted search API —
 * billed per search rather than per model call, cheaper than an LLM
 * provider's own web-search tool at watchlist scale (BRD §6.7, §8.2 cost
 * defense). Swappable: this is just one implementation of SearchClient.
 */
export class FirecrawlSearchClient implements SearchClient {
  constructor(private readonly apiKey: string) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const response = await fetch(FIRECRAWL_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, limit: options.limit ?? 5 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Firecrawl search failed (HTTP ${response.status})`);
    }
    const body = (await response.json()) as FirecrawlSearchResponse;
    const raw = Array.isArray(body.data) ? body.data : (body.data?.web ?? []);
    return raw
      .filter((item): item is FirecrawlWebResult & { url: string } => Boolean(item.url))
      .map((item) => ({
        url: item.url,
        title: item.title ?? item.url,
        snippet: item.description ?? "",
      }));
  }
}
