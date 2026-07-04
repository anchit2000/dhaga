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
