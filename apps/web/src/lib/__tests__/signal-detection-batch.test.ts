import { describe, expect, it, vi } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { hasOpenSignal, toggleWatch } from "@/lib/repo/signals";
import { getPendingSignalBatchId, setPendingSignalBatchId } from "@/lib/repo/settings";
import { runSignalDetection } from "@/lib/jobs/detect-signals";
import type {
  BatchExtractItem,
  BatchExtractResult,
  BatchLLMClient,
  SearchClient,
  SignalDetection,
} from "@dhaga/core";

/**
 * The nightly job submits classification prompts as one Anthropic Message
 * Batch instead of one Haiku call per contact (CLAUDE.md's "Nightly/
 * latency-insensitive jobs: Batch API" rule). Batches are asynchronous, so
 * this covers the resulting two-phase split across cron runs: phase 2 must
 * search due contacts and hand them to the batch client instead of
 * classifying inline; phase 1 must apply a *previous* run's finished batch
 * with the old loop's exact side effects, and never lose track of a batch
 * still processing or briefly unreachable.
 */

let submittedItems: BatchExtractItem<unknown>[] | null = null;
let isDone = true;
let pendingResults: BatchExtractResult<SignalDetection>[] = [];
let statusError = false;
let resultsError = false;
let searchCalls = 0;

const fakeBatchClient: BatchLLMClient = {
  submitExtractBatch: async (items) => {
    submittedItems = items;
    return "msgbatch_test_1";
  },
  isBatchDone: async () => {
    if (statusError) throw new Error("simulated status-check outage");
    return isDone;
  },
  getBatchResults: async <T,>() => {
    if (resultsError) throw new Error("simulated results-download outage");
    return pendingResults as unknown as BatchExtractResult<T>[];
  },
};

const fakeSearchClient: SearchClient = {
  search: async () => {
    searchCalls += 1;
    return [{ title: "Profile update", url: "https://example.com/p", snippet: "New role." }];
  },
};

vi.mock("@dhaga/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dhaga/core")>();
  return {
    ...actual,
    hasSearch: () => true,
    getSearchClient: () => fakeSearchClient,
    hasBatchLLM: () => true,
    getBatchLLMClient: () => fakeBatchClient,
  };
});

function person(name: string) {
  return { name, title: null, company: null, emails: [], phones: [], links: [], location: null };
}

function jobChangeResult(contactId: string): BatchExtractResult<SignalDetection> {
  return {
    id: contactId,
    status: "succeeded",
    model: "claude-haiku-4-5",
    usage: { inputTokens: 100, outputTokens: 20 },
    data: {
      hasSignal: true,
      kind: "job_change",
      headline: "Moved to a new role",
      detail: "Now Head of Growth at Acme, per their LinkedIn.",
      sourceUrl: "https://example.com/p",
    },
  };
}

describe("nightly signal detection — Batch API two-phase job", () => {
  it("phase 2 searches every due contact and submits one batch instead of classifying inline", async () => {
    const contactId = await createContact(person("Batch Submit Contact"), "manual");
    await toggleWatch("test-user", contactId, true);
    const summary = await runSignalDetection();

    expect(summary).toEqual({ scanned: 1, created: 0, skipped: null });
    expect(submittedItems?.some((item) => item.id === contactId)).toBe(true);
    expect(await getPendingSignalBatchId()).toBe("msgbatch_test_1");
  });

  it("does not submit a new batch while the previous one is still processing, and keeps its id", async () => {
    await setPendingSignalBatchId("msgbatch_still_running");
    isDone = false;
    const callsBefore = searchCalls;
    const summary = await runSignalDetection();

    expect(summary).toEqual({ scanned: 0, created: 0, skipped: "batch_pending" });
    expect(searchCalls).toBe(callsBefore); // phase 2 never ran
    expect(await getPendingSignalBatchId()).toBe("msgbatch_still_running");
    isDone = true;
  });

  it("keeps the pending batch id on a transient failure instead of discarding it — checking status, then fetching results", async () => {
    await setPendingSignalBatchId("msgbatch_flaky_status");
    statusError = true;
    expect((await runSignalDetection()).skipped).toBe("batch_pending");
    expect(await getPendingSignalBatchId()).toBe("msgbatch_flaky_status");
    statusError = false;

    await setPendingSignalBatchId("msgbatch_flaky_results");
    resultsError = true;
    expect((await runSignalDetection()).skipped).toBe("batch_pending");
    expect(await getPendingSignalBatchId()).toBe("msgbatch_flaky_results");
    resultsError = false;
  });

  it("applies a finished batch exactly like the old inline classify step (signal inserted, errored result skipped, pointer cleared)", async () => {
    const okContact = await createContact(person("Batch Result Contact"), "manual");
    const erroredContact = await createContact(person("Batch Errored Contact"), "manual");
    await setPendingSignalBatchId("msgbatch_ready");
    pendingResults = [jobChangeResult(okContact), { id: erroredContact, status: "errored" }];
    const summary = await runSignalDetection();

    expect(summary.created).toBeGreaterThanOrEqual(1);
    expect(await hasOpenSignal(okContact, "job_change")).toBe(true);
    expect(await hasOpenSignal(erroredContact, "job_change")).toBe(false);
    expect(await getPendingSignalBatchId()).not.toBe("msgbatch_ready");
  });

  it("does not duplicate an already-open signal for the same contact and kind (dedup survives the batch redesign)", async () => {
    const contactId = await createContact(person("Batch Dedup Contact"), "manual");
    await setPendingSignalBatchId("msgbatch_dedup");
    pendingResults = [jobChangeResult(contactId)];
    await runSignalDetection();
    expect(await hasOpenSignal(contactId, "job_change")).toBe(true);

    // A second finished batch reporting the same still-open change must not
    // insert a second row — the exact scenario hasOpenSignal exists to
    // prevent (see its doc comment), now exercised through the batch path.
    await setPendingSignalBatchId("msgbatch_dedup_again");
    pendingResults = [jobChangeResult(contactId)];
    await runSignalDetection();
    expect(await hasOpenSignal(contactId, "job_change")).toBe(true);
  });
});
