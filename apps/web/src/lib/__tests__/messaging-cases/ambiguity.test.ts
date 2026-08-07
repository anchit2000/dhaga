import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { chooseContactQuestion, needsInputLine } from "@/utils/constants/messaging";
import { contactNames, outcomeFor, resetStore, store } from "./harness";
import { fakeProvider } from "./provider";
import { plan, unclear } from "./plans";

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
 * AMBIGUITY. A note that could belong to two people is never guessed at — and it
 * is not argued about in chat either. It becomes a `note_subject` confirmation
 * the user resolves in the app, which is what lets a batch raise SEVERAL: chat
 * can hold one open question per sender, so the second ambiguous note in a batch
 * was quietly turned into a duplicate person.
 *
 * The invariants: ambiguity SAVES NOTHING until resolved (a note on the wrong
 * person is worse than a note that waits); the note body rides in the
 * confirmation so it can never be lost; the confirmation is raised with
 * `origin: "messaging"` — an inline question is answered on the spot, but one a
 * background batch raised has no other surface and hiding it strands the note;
 * its options are resolved to real candidate NAMES, because a raw id is not a
 * choice a human can make; every message that fed it is stamped `unclear`; and
 * the summary says how many are waiting rather than reading as a success.
 */
const ROHANS = [
  { id: "c1", name: "Rohan Mehta", title: "STPI" },
  { id: "c2", name: "Rohan Iyer", title: "Infosys" },
];
const NOTE = "Met Rohan at the summit, he runs the fintech desk";

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
  store.candidates = ROHANS;
});

describe("a note the planner would not attribute", () => {
  it("raises a visible confirmation carrying the note, and writes to nobody", async () => {
    store.items.push(itemRow("text", { text: NOTE }));
    store.plan = plan({
      unclear: [unclear({ subjectName: "Rohan", body: NOTE, candidateIds: ["c1", "c2"], seqs: [1] })],
    });

    const summary = await runBatch();

    // WHY: nothing may be written to a person we are not sure about. The note
    // lives in the confirmation payload until the user picks, so it is neither
    // lost nor filed on a guess.
    expect(contactNames()).toEqual([]);
    expect(store.notes).toEqual([]);
    expect(store.confirmations).toHaveLength(1);
    expect(store.confirmations[0].noteBody).toBe(NOTE);
    expect(store.confirmations[0].question).toBe(chooseContactQuestion("Rohan"));
    // Raised by a background batch, so it must land in the INBOX or it cannot be
    // answered at all — that is what origin "messaging" buys.
    expect(store.confirmations[0].origin).toBe("messaging");
    expect(store.confirmations[0].options).toEqual([
      { id: "c1", label: "Rohan Mehta", sublabel: "STPI" },
      { id: "c2", label: "Rohan Iyer", sublabel: "Infosys" },
    ]);
    expect(outcomeFor(1)?.kind).toBe("unclear");
    expect(outcomeFor(1)?.detail).toHaveProperty("confirmationId");
    // A batch waiting on the user has not failed — it must not read as one.
    expect(summary).toBe(needsInputLine(1));
  });

  it("raises one per ambiguous note instead of inventing duplicate people", async () => {
    store.items.push(itemRow("text", { text: NOTE }));
    store.items.push(itemRow("text", { text: "Rohan also wants an intro to Sequoia" }));
    store.plan = plan({
      unclear: [
        unclear({ subjectName: "Rohan", body: NOTE, candidateIds: ["c1", "c2"], seqs: [1] }),
        unclear({ subjectName: "Rohan", body: "wants an intro to Sequoia", candidateIds: ["c1", "c2"], seqs: [2] }),
      ],
    });

    const summary = await runBatch();

    // WHY: the old chat question allowed exactly one per batch and silently
    // minted a NEW "Rohan" for the second — a duplicate person created by a
    // limitation of the transport, which the user then had to merge by hand.
    expect(store.confirmations).toHaveLength(2);
    expect(contactNames()).toEqual([]);
    expect(summary).toBe(needsInputLine(2));
  });

  it("offers only candidates it was actually shown, never a raw id", async () => {
    store.items.push(itemRow("text", { text: NOTE }));
    store.plan = plan({
      unclear: [
        unclear({ subjectName: "Rohan", body: NOTE, candidateIds: ["c1", "made-up-id"], seqs: [1] }),
      ],
    });

    await runBatch();

    // WHY: an unresolvable id would render as a blank or literal-uuid option —
    // an unanswerable question, which is the same as losing the note.
    expect(store.confirmations[0].options.map((option) => option.label)).toEqual(["Rohan Mehta"]);
  });
});
