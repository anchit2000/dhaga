import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { mediaFailedNotice, unaccountedLine } from "@/utils/constants/messaging";
import { contactNames, outcomeFor, resetStore, store } from "./harness";
import { fakeProvider } from "./provider";
import { person, plan, unclear } from "./plans";

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
 * ACCOUNTING. Every forwarded message ends with a VERDICT, and the closing
 * report says the same thing the capture log will show.
 *
 * The sender is standing in front of somebody, and a message that produced
 * nothing while saying nothing about it is — from their side — indistinguishable
 * from one that worked. So a plan that forgets a message does not lose it
 * quietly: it is stamped `unaccounted`, the sender is told which one, and the
 * capture log can point at it. A planner BUG made visible, not swallowed
 * (Rule 12). The six verdicts are the vocabulary that log renders, so they are
 * pinned here as one list: drop or rename one and this fails.
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

describe("a plan that never mentions a message", () => {
  it("stamps it unaccounted and tells the sender, rather than dropping it", async () => {
    store.items.push(itemRow("text", { text: BIO }));
    store.items.push(itemRow("text", { text: "also met his co-founder Priya" }));
    store.plan = plan({
      people: [person({ name: "Priya Raman", seqs: [1], notes: [{ body: BIO, seqs: [1] }] })],
    });

    const summary = await runBatch();

    // WHY: silence here reads as success. The sender believes both messages
    // landed, and only the second one didn't — a contact they think they have.
    expect(outcomeFor(2)).toMatchObject({ kind: "unaccounted", detail: { reason: "not_in_plan" } });
    expect(store.notes.map((note) => note.body)).toEqual([BIO]);
    expect(summary).toContain(unaccountedLine([2]));
  });
});

describe("a batch that ends every way at once", () => {
  it("records one verdict per message, and one bad item costs only itself", async () => {
    store.media = null; // the image download throws
    store.candidates = [
      { id: "existing-bob", name: "Bob Chen", title: "CTO" },
      { id: "c1", name: "Rohan Mehta", title: null },
      { id: "c2", name: "Rohan Iyer", title: null },
    ];
    store.items.push(itemRow("text", { text: BIO }));
    store.items.push(itemRow("text", { text: "Create a new contact" }));
    store.items.push(itemRow("text", { text: "Bob Chen wants an intro" }));
    store.items.push(itemRow("text", { text: "Met Rohan at the summit" }));
    store.items.push(
      itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }),
    );
    store.items.push(itemRow("text", { text: "forgotten by the planner" }));
    store.plan = plan({
      people: [
        person({ name: "Priya Raman", seqs: [1, 2], notes: [{ body: BIO, seqs: [1] }] }),
        person({
          name: "Bob Chen",
          existingContactId: "existing-bob",
          seqs: [3],
          notes: [{ body: "wants an intro", seqs: [3] }],
        }),
      ],
      unclear: [
        unclear({ subjectName: "Rohan", body: "Met Rohan at the summit", candidateIds: ["c1", "c2"], seqs: [4] }),
      ],
    });

    const summary = await runBatch();

    // WHY: the capture log reads these back verbatim — a message with no verdict
    // renders as a blank row the user cannot interpret.
    expect([1, 2, 3, 4, 5, 6].map((seq) => outcomeFor(seq)?.kind)).toEqual([
      "created",
      "directive",
      "attached",
      "unclear",
      "unreadable",
      "unaccounted",
    ]);
    // The undownloadable photo cost the batch exactly one message.
    expect(summary).toContain(mediaFailedNotice());
    expect(contactNames()).toEqual(["Priya Raman"]);
    expect(store.confirmations).toHaveLength(1);
  });
});
