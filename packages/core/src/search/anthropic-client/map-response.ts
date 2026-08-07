import type Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "../types";

/**
 * Anthropic's web search returns a MODEL TURN, not a result list, so the
 * SearchClient contract has to be reconstructed from two different block kinds.
 * Neither half is invented here — every field below is provider-supplied:
 *
 *   `web_search_tool_result` → `web_search_result` blocks carry `url` + `title`.
 *   `text` → `citations` of type `web_search_result_location` carry
 *            `cited_text`, an excerpt the API extracts VERBATIM from the source
 *            page (up to 150 chars) — not prose the model wrote.
 *
 * So url/title come from the result blocks and snippet comes from the citation
 * for that url. THE ONE PLACE THE CONTRACT CANNOT BE HONESTLY SATISFIED is a
 * result the model never cited: there is no snippet for it anywhere in the
 * response, and asking the model to write one would be exactly the fabrication
 * SIGNAL_DETECTION_SYSTEM tells the classifier not to trust. Such results keep
 * `snippet: ""` — the same value FirecrawlSearchClient uses for a result with
 * no description, and a value buildSignalDetectionPrompt already renders.
 */

/** A result whose url only ever appeared in a citation still counts: the
 *  citation is itself provider-supplied evidence the search returned it. */
function upsert(byUrl: Map<string, SearchResult>, result: SearchResult): void {
  const existing = byUrl.get(result.url);
  if (!existing) {
    byUrl.set(result.url, result);
    return;
  }
  // First non-empty snippet wins; a later duplicate never overwrites a real one.
  if (!existing.snippet && result.snippet) existing.snippet = result.snippet;
}

export interface MappedSearch {
  results: SearchResult[];
  /** Set when the search tool itself failed. The API reports these as HTTP 200
   *  with an error block, so this is the only signal a search did not run. */
  errorCode: string | null;
}

export function mapSearchResponse(
  content: Anthropic.ContentBlock[],
  limit: number,
): MappedSearch {
  const byUrl = new Map<string, SearchResult>();
  let errorCode: string | null = null;

  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    if (!Array.isArray(block.content)) {
      // `content` is a single web_search_tool_result_error object, not a list.
      errorCode = block.content.error_code;
      continue;
    }
    for (const result of block.content) {
      upsert(byUrl, { url: result.url, title: result.title || result.url, snippet: "" });
    }
  }

  for (const block of content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const citation of block.citations) {
      if (citation.type !== "web_search_result_location") continue;
      upsert(byUrl, {
        url: citation.url,
        title: citation.title || citation.url,
        snippet: citation.cited_text,
      });
    }
  }

  return { results: [...byUrl.values()].slice(0, limit), errorCode };
}
