import { afterEach, describe, expect, it, vi } from "vitest";
import { FirecrawlSearchClient } from "@dhaga/core";

/**
 * Pins the exact Firecrawl response shape this client depends on. There's
 * no live-API test in this suite (no network in CI) — this is the contract
 * doc: if Firecrawl changes their envelope, this is what breaks first
 * instead of silently returning zero results in production.
 */
describe("FirecrawlSearchClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the {data: {web: [...]}} envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              web: [
                { url: "https://example.com/a", title: "A", description: "About A" },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const results = await new FirecrawlSearchClient("test-key").search("query");
    expect(results).toEqual([
      { url: "https://example.com/a", title: "A", snippet: "About A" },
    ]);
  });

  it("parses a flat {data: [...]} envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ url: "https://example.com/b" }] }), {
          status: 200,
        }),
      ),
    );
    const results = await new FirecrawlSearchClient("test-key").search("query");
    // Missing title/description degrade to the url and an empty snippet
    // rather than throwing — a sparse result is still a usable result.
    expect(results).toEqual([
      { url: "https://example.com/b", title: "https://example.com/b", snippet: "" },
    ]);
  });

  it("drops results with no url instead of passing through bad data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { web: [{ title: "No URL" }] } }), {
          status: 200,
        }),
      ),
    );
    const results = await new FirecrawlSearchClient("test-key").search("query");
    expect(results).toEqual([]);
  });

  it("throws on a non-OK response so the caller's catch can skip this contact", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(new FirecrawlSearchClient("test-key").search("query")).rejects.toThrow();
  });
});
