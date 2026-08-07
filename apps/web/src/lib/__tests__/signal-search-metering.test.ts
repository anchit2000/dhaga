import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { aiActions } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { toggleWatch } from "@/lib/repo/signals";
import { setPendingSignalBatchId } from "@/lib/repo/settings";
import { runSignalDetection } from "@/lib/jobs/detect-signals";
import type {
  BatchExtractResult,
  BatchLLMClient,
  MeteredSearchClient,
  SearchClient,
} from "@dhaga/core";

/**
 * Metering the SEARCH half of the nightly sweep.
 *
 * Under Firecrawl this half cost nothing at the margin — a flat subscription,
 * outside our metering by design — so the sweep recorded only the Batch
 * classification. Anthropic's web-search tool changes the economics: every
 * search is a model turn whose retrieved pages are billed as input tokens. If
 * those go unrecorded, the instance dollar ceiling (lib/ai/metering/dollar-cap)
 * cannot see the more expensive half of the job BRD §8.3 names as the main cost
 * driver, and an operator's cost screen quietly understates it by ~20×.
 */

/** Distinctive so the assertion can't be satisfied by any other metered call. */
const SEARCH_MODEL = "test-search-model";

const searchResults = [
  { title: "Profile update", url: "https://example.com/p", snippet: "New role." },
];

/** Reports a cost — what AnthropicSearchClient does. */
const meteredSearchClient: MeteredSearchClient = {
  search: async () => searchResults,
  searchMetered: async () => ({
    results: searchResults,
    usage: {
      searches: 1,
      model: SEARCH_MODEL,
      tokens: { inputTokens: 4000, outputTokens: 300 },
    },
  }),
};

/** Reports nothing — what Firecrawl/SearXNG do. */
const plainSearchClient: SearchClient = { search: async () => searchResults };

let currentSearchClient: SearchClient = meteredSearchClient;

const fakeBatchClient: BatchLLMClient = {
  submitExtractBatch: async () => "msgbatch_metering_test",
  isBatchDone: async () => true,
  getBatchResults: async <T,>() => [] as BatchExtractResult<T>[],
};

vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  return {
    ...actual,
    hasSearch: () => true,
    getSearchClient: () => currentSearchClient,
    hasBatchLLM: () => true,
    getBatchLLMClient: () => fakeBatchClient,
  };
});

function person(name: string) {
  return { name, title: null, company: null, emails: [], phones: [], links: [], location: null };
}

async function searchRowCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(aiActions).where(eq(aiActions.model, SEARCH_MODEL));
  return rows.length;
}

describe("nightly signal detection — search-phase metering", () => {
  it("records the tokens a model-backed search spent, against signal_detection", async () => {
    await setPendingSignalBatchId(null);
    currentSearchClient = meteredSearchClient;
    const contactId = await createContact(person("Metered Search Contact"), "manual");
    await toggleWatch("test-user", contactId, true);

    await runSignalDetection();

    const db = await getDb();
    const rows = await db.select().from(aiActions).where(eq(aiActions.model, SEARCH_MODEL));
    expect(rows).toHaveLength(1);
    // Feature, not a new one: the search and the classification are two halves
    // of the same watchlist scan, priced at 0 credits — so this changes what the
    // DOLLAR gate sees and never what a user's credit balance says.
    expect(rows[0].feature).toBe("signal_detection");
    expect(rows[0].inputTokens).toBe(4000);
    expect(rows[0].outputTokens).toBe(300);
    // Synchronous turn — the Batch discount applies to the classification only,
    // and recording batch:true here would halve a real bill.
    expect(rows[0].batch).toBe(false);

    await setPendingSignalBatchId(null);
  });

  it("records nothing for a provider that cannot report a cost, and still sweeps", async () => {
    // WHY: SearchClient stays the contract; reporting cost is an optional
    // capability. A Firecrawl or SearXNG provider must keep working with no
    // change to the sweep — and must not have a cost invented for it, which
    // would over-report spend and trip the dollar gate on someone else's bill.
    await setPendingSignalBatchId(null);
    currentSearchClient = plainSearchClient;
    const before = await searchRowCount();
    const contactId = await createContact(person("Unmetered Search Contact"), "manual");
    await toggleWatch("test-user", contactId, true);

    const summary = await runSignalDetection();

    expect(summary.skipped).toBeNull();
    expect(summary.scanned).toBeGreaterThanOrEqual(1);
    expect(await searchRowCount()).toBe(before);

    await setPendingSignalBatchId(null);
    currentSearchClient = meteredSearchClient;
  });
});
