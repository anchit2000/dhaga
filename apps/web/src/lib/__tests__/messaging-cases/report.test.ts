import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import {
  attachedPersonLine,
  batchFailureReply,
  createdPersonLine,
} from "@/utils/constants/messaging";
import { contactNames, resetStore, store } from "./harness";
import { fakeProvider } from "./provider";
import { person, plan } from "./plans";

vi.mock("@/lib/db/request-scope", async () => (await import("./mocks")).requestScopeMock());
vi.mock("next/server", async () => (await import("./mocks")).afterMock());
vi.mock("@/lib/repo/messaging", async () => (await import("./mocks")).repoMessagingMock());
vi.mock("@/lib/repo/confirmations", async () => (await import("./mocks")).confirmationsMock());
vi.mock("@/lib/repo/contacts", async () => (await import("./mocks")).contactsMock());
vi.mock("@/lib/repo/notes", async () => (await import("./mocks")).notesMock());
vi.mock("@/lib/repo/embeddings", async () => (await import("./mocks")).embeddingsMock());
vi.mock("@/lib/repo/card-images", async () => (await import("./mocks")).cardImagesMock());
vi.mock("@/lib/repo/settings", async () => (await import("./mocks")).settingsMock());
vi.mock("@/lib/repo/edge-suggestions", async () => (await import("./mocks")).aiMock().edges);
vi.mock("@/lib/ai/note-extraction", async () => (await import("./mocks")).noteExtractionMock());
vi.mock("@/lib/ai/batch-plan", async () => (await import("./mocks")).batchPlanMock());
vi.mock("@/lib/ai/card-scan", async () => (await import("./mocks")).aiMock().cardScan);
vi.mock("@/lib/ai/photo-note", async () => (await import("./mocks")).aiMock().photoNote);
vi.mock("@/lib/ai/metering", async () => (await import("./mocks")).aiMock().metering);
vi.mock("@/app/api/telegram/route", async () => (await import("./mocks")).aiMock().owner);

const { processMessagingSession } = await import("@/lib/messaging");
const { itemRow } = await import("./mocks");

/**
 * WHAT THE SENDER IS TOLD — the only view they have of a background job.
 *
 * On success the report is the OUTCOME per person ("I created a new contact and
 * then added your note to that newly created contact"), which is what replaced
 * the old attribution ledger: that ledger reported the BASIS of each positional
 * guess because the walk had to guess. The planner either knows who a note is
 * about or says it does not, so the honest line is what happened, per person.
 *
 * On failure the report must say the batch is intact, and the code must MEAN it.
 * There is deliberately no fallback to the per-message walk: degrading to it
 * would rebuild the wrong graph while reporting success — the exact bug this
 * replaced. Failing loudly and staying retryable is the correct behaviour.
 */
const BIO = "Priya Raman is the founder of Lumen Labs";

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
});

describe("a batch that worked", () => {
  it("says per person what happened to them, created and existing apart", async () => {
    store.candidates = [{ id: "existing-bob", name: "Bob Chen", title: "CTO" }];
    store.items.push(itemRow("text", { text: BIO }));
    store.plan = plan({
      people: [
        person({
          name: "Priya Raman",
          seqs: [1],
          notes: [
            { body: BIO, seqs: [1] },
            { body: "introduced by Neha Kulkarni", seqs: [1] },
          ],
        }),
        person({
          name: "Bob Chen",
          existingContactId: "existing-bob",
          seqs: [1],
          notes: [{ body: "wants an intro", seqs: [1] }],
        }),
      ],
    });

    // WHY: "created" vs "added to" is the distinction the user asked for. A line
    // claiming a new contact when the note went onto an existing one (or the
    // reverse) is worse than no line — they will not go and check.
    expect(await runBatch()).toBe(
      `${createdPersonLine("Priya Raman", 2)}\n${attachedPersonLine("Bob Chen", 1)}`,
    );
  });
});

describe("a batch that could not be planned", () => {
  it("writes nothing, stays retryable, and says nothing was lost", async () => {
    store.planError = "plan_failed";
    store.items.push(itemRow("text", { text: BIO }));
    store.items.push(itemRow("text", { text: "Create a new contact" }));

    const summary = await runBatch();

    // WHY: half a batch is worse than none of it. A partial write the sender
    // cannot see means duplicates on the retry, so the failure path writes
    // NOTHING — no contact, no note, no verdict — and leaves every item
    // unprocessed so a later DONE re-drives exactly what did not land.
    expect(contactNames()).toEqual([]);
    expect(store.notes).toEqual([]);
    expect(store.confirmations).toEqual([]);
    expect(store.outcomes).toEqual([]);
    expect(store.items.every((item) => item.processedAt === null)).toBe(true);

    // The stored reason is a fixed code, never the forwarded content: this row
    // is rendered in the capture log and may reach a server log line.
    expect(store.statuses).toContain("failed");
    expect(store.sessionOutcome).toEqual({ summary: null, error: "plan_failed" });
    expect(summary).toBe(batchFailureReply("plan_failed"));
    expect(summary).toContain("Nothing was lost");
  });

  it("reports the reason it was given rather than a generic apology", async () => {
    // WHY: "out of credits" and "no AI configured" are different actions for the
    // user. Collapsing them into one message makes the batch look broken when it
    // is actually waiting on a decision only they can make.
    store.planError = "no_llm";
    store.items.push(itemRow("text", { text: BIO }));

    expect(await runBatch()).toBe(batchFailureReply("no_llm"));
    expect(store.sessionOutcome?.error).toBe("no_llm");
  });
});
