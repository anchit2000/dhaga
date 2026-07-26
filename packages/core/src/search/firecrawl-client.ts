import type { SearchClient, SearchOptions, SearchResult } from "./types";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";

/**
 * Retry tunables. Mirrors the Anthropic SDK client's default `maxRetries: 2`
 * with exponential backoff (see ../llm/anthropic-client) so a flaky search
 * hop is as resilient as a flaky model hop. No shared core constants module
 * fits, so these live local to the module (CLAUDE.md's file-org rule).
 */
const FIRECRAWL_TIMEOUT_MS = 15_000;
const FIRECRAWL_MAX_RETRIES = 2;
const FIRECRAWL_BACKOFF_BASE_MS = 500;
const FIRECRAWL_BACKOFF_JITTER_MS = 250;

/** Transient HTTP statuses worth retrying (plus any 5xx). */
const RETRIABLE_HTTP_STATUSES: ReadonlySet<number> = new Set([408, 409, 429]);

function isRetriableStatus(status: number): boolean {
  return status >= 500 || RETRIABLE_HTTP_STATUSES.has(status);
}

function backoffDelayMs(attempt: number): number {
  return FIRECRAWL_BACKOFF_BASE_MS * 2 ** attempt + Math.random() * FIRECRAWL_BACKOFF_JITTER_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const response = await this.fetchWithRetry(query, options);
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

  /**
   * Bounded retry with exponential backoff + jitter, retrying only transient
   * failures — network/abort/timeout rejections and HTTP 408/409/429/5xx.
   * Other 4xx (bad key, bad request) bail immediately with the original error.
   * Each attempt keeps its own 15s timeout.
   */
  private async fetchWithRetry(query: string, options: SearchOptions): Promise<Response> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    const requestBody = JSON.stringify({ query, limit: options.limit ?? 5 });
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= FIRECRAWL_MAX_RETRIES; attempt++) {
      let response: Response | null = null;
      try {
        response = await fetch(FIRECRAWL_SEARCH_URL, {
          method: "POST",
          headers,
          body: requestBody,
          signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
        });
      } catch (error) {
        // fetch() rejects on network/abort/timeout — transient, retry below.
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (response) {
        if (response.ok) return response;
        lastError = new Error(`Firecrawl search failed (HTTP ${response.status})`);
        // Non-transient 4xx won't get better on retry — fail fast.
        if (!isRetriableStatus(response.status)) throw lastError;
      }

      if (attempt < FIRECRAWL_MAX_RETRIES) {
        await sleep(backoffDelayMs(attempt));
      }
    }

    throw lastError ?? new Error("Firecrawl search failed");
  }
}
