import Anthropic from "@anthropic-ai/sdk";
import { cachedSystem, TIER_MODELS } from "../../llm/anthropic-client/shared";
import { buildWebSearchPrompt, WEB_SEARCH_SYSTEM } from "../../llm/prompts/web-search";
import type { MeteredSearchClient, SearchOptions, SearchResponse, SearchResult } from "../types";
import { mapSearchResponse } from "./map-response";

/** Matches FirecrawlSearchClient's default so swapping providers doesn't
 *  silently change how much context the signal classifier gets. */
const DEFAULT_LIMIT = 5;

/**
 * The model only has to issue a query and cite the hits — no reasoning — so
 * this runs on the cheap extract tier. Output is short by construction
 * (WEB_SEARCH_SYSTEM caps the prose at a sentence); the retrieved pages are
 * charged as INPUT tokens, which no max_tokens value bounds.
 */
const SEARCH_MAX_TOKENS = 1024;

/**
 * SearchClient over Anthropic's own server-side `web_search` tool — the same
 * mechanism apps/web/src/lib/ai/enrich.ts already uses via `webSearch: true`,
 * reused here so there is one way this product searches the web.
 *
 * Two deliberate departures from the enrichment call:
 *
 * `allowed_callers: ["direct"]`. On `web_search_20260209` this field defaults
 * to code execution, i.e. DYNAMIC FILTERING: the model writes code that drops
 * results it judges irrelevant before they reach its context. That is right for
 * enrichment (which wants an answer) and wrong here (a SearchClient promises the
 * search's results, not a model's pick of them) — and it would silently narrow
 * what the signal classifier ever gets to see. Direct calling also sidesteps
 * needing programmatic-tool-calling support on the extract-tier model.
 *
 * `max_uses: 1`. One `search()` call means one search — both because that is
 * what the contract says and because searches are billed at $10/1k on top of
 * tokens (see SearchUsage in ../types).
 *
 * `SearchOptions.limit` is applied CLIENT-SIDE in ./map-response: the provider
 * has no result-count parameter, so this trims what came back rather than
 * asking for fewer. The searches are billed the same either way.
 */
export class AnthropicSearchClient implements MeteredSearchClient {
  private readonly client: Anthropic;
  private readonly model = TIER_MODELS.extract;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { results } = await this.searchMetered(query, options);
    return results;
  }

  async searchMetered(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: SEARCH_MAX_TOKENS,
      system: cachedSystem(WEB_SEARCH_SYSTEM),
      messages: [{ role: "user", content: buildWebSearchPrompt(query) }],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 1,
          allowed_callers: ["direct"],
        },
      ],
    });

    const { results, errorCode } = mapSearchResponse(
      response.content,
      options.limit ?? DEFAULT_LIMIT,
    );

    // A failed search must NOT read as "nothing new about this person".
    // The API returns HTTP 200 on rate limits and outages alike, so swallowing
    // the error block would hand the classifier an empty result set and let it
    // conclude there is no signal — then the caller stamps the contact scanned
    // and skips it for a whole rescan cycle. Throw instead, exactly as
    // FirecrawlSearchClient throws on a failed HTTP call.
    if (errorCode && results.length === 0) {
      throw new Error(`Anthropic web search failed (${errorCode})`);
    }

    return {
      results,
      usage: {
        searches: response.usage.server_tool_use?.web_search_requests ?? 0,
        model: this.model,
        tokens: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      },
    };
  }
}

export { mapSearchResponse } from "./map-response";
