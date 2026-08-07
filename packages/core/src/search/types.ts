import type { LLMUsage } from "../llm/types";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOptions {
  limit?: number;
}

/**
 * Provider-agnostic web search — the counterpart to LLMClient (see ../llm).
 * Self-hosters and contributors add a provider by implementing this
 * interface and registering it in getSearchClient() (../search/index.ts);
 * callers never see which provider ran (Dependency Inversion).
 */
export interface SearchClient {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

/**
 * What one search actually cost, for providers whose searches are billed.
 *
 * This exists because the two providers cost money in different currencies.
 * Firecrawl bills a flat subscription outside our metering entirely; Anthropic's
 * server-side web search bills $10/1k searches AND charges every retrieved page
 * to the calling model's input tokens. Those tokens are a real inference bill
 * that `ai_actions` must see, or the instance dollar ceiling
 * (apps/web/src/lib/ai/metering/dollar-cap.ts) silently under-counts the one
 * background job BRD §8.3 names as the main cost driver.
 */
export interface SearchUsage {
  /** Provider-side searches performed. Providers not billed per search report 0. */
  searches: number;
  /** Set only when the provider ran the search THROUGH a model. */
  model?: string;
  /** The model tokens that search consumed. Present iff `model` is. */
  tokens?: LLMUsage;
}

export interface SearchResponse {
  results: SearchResult[];
  usage: SearchUsage;
}

/**
 * Capability interface for providers that can report what a search cost.
 * Kept separate from SearchClient for the same reason BatchLLMClient is kept
 * separate from LLMClient (Interface Segregation): a SearXNG or Brave client
 * has no inference bill to report and must not be forced to invent one.
 *
 * Callers feature-detect with `isMeteredSearchClient` and meter when they can —
 * so adding a plain SearchClient provider still needs zero caller changes.
 */
export interface MeteredSearchClient extends SearchClient {
  searchMetered(query: string, options?: SearchOptions): Promise<SearchResponse>;
}

export function isMeteredSearchClient(client: SearchClient): client is MeteredSearchClient {
  return typeof (client as Partial<MeteredSearchClient>).searchMetered === "function";
}

export interface SearchProvider {
  id: string;
  isConfigured(): boolean;
  createClient(): SearchClient;
}
