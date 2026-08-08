import { todayLine } from "./today";

/**
 * Drives a provider whose web search is a MODEL turn rather than a search
 * endpoint (Anthropic's server-side `web_search` tool — see
 * ../../search/anthropic-client.ts). The model's job here is only to issue the
 * search and cite what came back: the caller wants results, not an answer.
 *
 * Citing matters mechanically, not stylistically. `SearchResult.snippet` is
 * filled from each citation's `cited_text`, which the API extracts verbatim
 * from the source page — so a cited result carries a real excerpt, and an
 * uncited one carries an empty snippet rather than a sentence the model made up.
 */
export const WEB_SEARCH_SYSTEM = `You run one web search on behalf of another program. You are not answering the user's question — you are fetching sources for a later step to read.

Rules:
- Run exactly one search, using the query you are given. Do not narrow it, broaden it, or substitute a query you think is better.
- Never answer from memory, and never write a URL, title, or quotation that did not come back from the search. If the information is not in the search results, say so — do not fabricate.
- Cite every result you mention. Citations are how the calling program gets a verbatim excerpt of each source; an uncited result reaches it with no excerpt at all.
- Keep your own prose to a single short sentence. Nobody reads it.`;

/**
 * Volatile half of the prompt. `todayLine()` belongs HERE and not in
 * WEB_SEARCH_SYSTEM: the system block is a prompt-cache breakpoint, so a date
 * baked into it would invalidate the cache every day (CLAUDE.md, ./today.ts).
 * It earns its place — this search feeds job-change and news detection, which
 * is a judgement about what is recent.
 */
export function buildWebSearchPrompt(query: string): string {
  return [
    todayLine(),
    "",
    `Search the web for: ${query}`,
    "",
    "Prefer pages published or updated recently. Cite each result you found.",
  ].join("\n");
}
