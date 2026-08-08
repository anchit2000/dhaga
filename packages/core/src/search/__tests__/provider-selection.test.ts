import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AnthropicSearchClient,
  FirecrawlSearchClient,
  getSearchClient,
  getSearchProvider,
  hasSearch,
  selectSearchProvider,
} from "../index";

/**
 * Which provider the gateway picks, and — the point of this whole change —
 * whether `hasSearch()` is true at all.
 *
 * `hasSearch()` is not a cosmetic predicate. It is the first line of
 * runSignalDetection(), which returns `{ skipped: "no_search" }` and does
 * nothing when it is false, and it is what /app/people/[id] passes to
 * WatchToggle as `searchConfigured` to grey the control out with a "Coming
 * soon" notice. False here means job-change and news detection do not exist as
 * a product. It was false in production because FIRECRAWL_API_KEY was never
 * set; these tests pin that an ANTHROPIC_API_KEY is now enough.
 */

const KEYS = ["FIRECRAWL_API_KEY", "ANTHROPIC_API_KEY", "SEARCH_PROVIDER"] as const;
let saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  selectSearchProvider(null);
});

afterEach(() => {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  selectSearchProvider(null);
});

describe("search provider selection", () => {
  it("is unconfigured when no key is set, so signal detection stays a no-op", () => {
    expect(hasSearch()).toBe(false);
  });

  it("configures itself from ANTHROPIC_API_KEY alone", () => {
    // WHY: this is the change. With no Firecrawl subscription, the key the
    // product already requires for every other AI feature now also arms
    // job-change detection — no new secret, no code change, no build flag.
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(hasSearch()).toBe(true);
    expect(getSearchProvider().id).toBe("anthropic");
    expect(getSearchClient()).toBeInstanceOf(AnthropicSearchClient);
  });

  it("still prefers Firecrawl when its key is set", () => {
    // WHY: a self-host that already pays for Firecrawl must not be silently
    // switched onto a per-search-billed provider by upgrading.
    process.env.FIRECRAWL_API_KEY = "fc-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getSearchProvider().id).toBe("firecrawl");
    expect(getSearchClient()).toBeInstanceOf(FirecrawlSearchClient);
  });

  it("lets an explicit SEARCH_PROVIDER override both keys", () => {
    // WHY: the documented escape hatch (docs/PROVIDERS.md). An operator with
    // both keys set must be able to force the cheaper one either way.
    process.env.FIRECRAWL_API_KEY = "fc-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.SEARCH_PROVIDER = "anthropic";
    expect(getSearchProvider().id).toBe("anthropic");
    expect(getSearchClient()).toBeInstanceOf(AnthropicSearchClient);
  });

  it("reports unconfigured — not misconfigured — when SEARCH_PROVIDER names a provider with no key", () => {
    process.env.SEARCH_PROVIDER = "firecrawl";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(hasSearch()).toBe(false);
    expect(() => getSearchClient()).toThrow(/FIRECRAWL_API_KEY/);
  });

  it("fails loudly on an unknown SEARCH_PROVIDER instead of falling back", () => {
    process.env.SEARCH_PROVIDER = "brave";
    expect(() => getSearchProvider()).toThrow(/Unknown SEARCH_PROVIDER/);
  });

  it("names ANTHROPIC_API_KEY in the error when nothing is configured", () => {
    // WHY: the default provider decides which key the operator is told to set.
    // Pointing them at Firecrawl would send them to buy a subscription this
    // product deliberately no longer uses.
    expect(() => getSearchClient()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
