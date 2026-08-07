import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { mapSearchResponse } from "../anthropic-client/map-response";

/**
 * Anthropic's web search hands back a model turn, not a result list, so
 * `SearchClient`'s url/title/snippet has to be rebuilt from two block kinds.
 * These tests pin the honesty of that reconstruction, because the thing reading
 * the output is buildSignalDetectionPrompt — a classifier explicitly told
 * "only use information present in the search results below". Every wrong
 * mapping here becomes a job-change alert about a person, sourced from nothing.
 */

function resultBlock(
  results: { url: string; title: string }[],
): Anthropic.ContentBlock {
  return {
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    caller: { type: "direct" },
    content: results.map((result) => ({
      type: "web_search_result",
      url: result.url,
      title: result.title,
      page_age: null,
      encrypted_content: "enc",
    })),
  } as Anthropic.ContentBlock;
}

function textBlock(
  text: string,
  citations: { url: string; title: string | null; cited_text: string }[] = [],
): Anthropic.ContentBlock {
  return {
    type: "text",
    text,
    citations: citations.map((citation) => ({
      type: "web_search_result_location",
      url: citation.url,
      title: citation.title,
      cited_text: citation.cited_text,
      encrypted_index: "idx",
    })),
  } as Anthropic.ContentBlock;
}

describe("mapSearchResponse", () => {
  it("takes url and title from the result block and the snippet from that url's citation", () => {
    // WHY: the snippet is the only prose the classifier actually reasons over.
    // It must be `cited_text` — an excerpt the API lifts verbatim from the page
    // — and never the model's own summary of the page, which is unverifiable.
    const { results } = mapSearchResponse(
      [
        resultBlock([{ url: "https://ex.com/a", title: "Ada joins Foo" }]),
        textBlock("Found one.", [
          {
            url: "https://ex.com/a",
            title: "Ada joins Foo",
            cited_text: "Ada Lovelace has joined Foo Corp as CTO.",
          },
        ]),
      ],
      5,
    );
    expect(results).toEqual([
      {
        url: "https://ex.com/a",
        title: "Ada joins Foo",
        snippet: "Ada Lovelace has joined Foo Corp as CTO.",
      },
    ]);
  });

  it("leaves an uncited result's snippet empty rather than inventing one", () => {
    // WHY: this is the case where the contract cannot be honestly satisfied —
    // the response contains no excerpt for this url anywhere. An empty snippet
    // is what FirecrawlSearchClient emits for a description-less hit, and
    // buildSignalDetectionPrompt already renders it. Filling it would be
    // fabrication dressed as a search result.
    const { results } = mapSearchResponse(
      [resultBlock([{ url: "https://ex.com/b", title: "Directory listing" }])],
      5,
    );
    expect(results).toEqual([
      { url: "https://ex.com/b", title: "Directory listing", snippet: "" },
    ]);
  });

  it("keeps the first citation's excerpt when a url is cited twice", () => {
    const { results } = mapSearchResponse(
      [
        resultBlock([{ url: "https://ex.com/a", title: "A" }]),
        textBlock("one", [{ url: "https://ex.com/a", title: "A", cited_text: "first" }]),
        textBlock("two", [{ url: "https://ex.com/a", title: "A", cited_text: "second" }]),
      ],
      5,
    );
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toBe("first");
  });

  it("reports the error code and no results when the search tool itself failed", () => {
    // WHY: the API returns HTTP 200 for a rate-limited or unavailable search.
    // If that read as an empty result set, the classifier would conclude "no
    // news about this person" and the sweep would stamp the contact scanned —
    // silently skipping them for a full rescan cycle on an outage.
    const { results, errorCode } = mapSearchResponse(
      [
        {
          type: "web_search_tool_result",
          tool_use_id: "srvtoolu_1",
          caller: { type: "direct" },
          content: { type: "web_search_tool_result_error", error_code: "too_many_requests" },
        } as Anthropic.ContentBlock,
      ],
      5,
    );
    expect(results).toEqual([]);
    expect(errorCode).toBe("too_many_requests");
  });

  it("applies the caller's limit client-side", () => {
    // WHY: Anthropic has no result-count parameter, so SearchOptions.limit can
    // only be honoured by trimming. If it silently didn't apply, every
    // classification prompt would carry more pages than the Firecrawl path fed
    // it — same prompt, quietly different cost and behaviour.
    const { results } = mapSearchResponse(
      [
        resultBlock([
          { url: "https://ex.com/1", title: "1" },
          { url: "https://ex.com/2", title: "2" },
          { url: "https://ex.com/3", title: "3" },
        ]),
      ],
      2,
    );
    expect(results.map((result) => result.url)).toEqual([
      "https://ex.com/1",
      "https://ex.com/2",
    ]);
  });
});
