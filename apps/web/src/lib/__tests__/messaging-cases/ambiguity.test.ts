import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { awaitingAnswerReply } from "@/utils/constants/messaging";
import { contact, contactNames, fakeProvider, resetStore, store } from "./harness";

vi.mock("@/lib/db/request-scope", async () => (await import("./mocks")).requestScopeMock());
vi.mock("next/server", async () => (await import("./mocks")).afterMock());
vi.mock("@/lib/repo/messaging", async () => (await import("./mocks")).repoMessagingMock());
vi.mock("@/lib/repo/confirmations", async () => (await import("./mocks")).confirmationsMock());
vi.mock("@/lib/repo/contacts", async () => (await import("./mocks")).contactsMock());
vi.mock("@/lib/repo/notes", async () => (await import("./mocks")).notesMock());
vi.mock("@/lib/repo/embeddings", async () => (await import("./mocks")).embeddingsMock());
vi.mock("@/lib/ai/note-extraction", async () => (await import("./mocks")).noteExtractionMock());
vi.mock("@/lib/ai/contact-extraction", async () => (await import("./mocks")).contactExtractionMock());
vi.mock("@/lib/ai/card-scan", async () => (await import("./mocks")).aiMock().cardScan);
vi.mock("@/lib/ai/photo-note", async () => (await import("./mocks")).aiMock().photoNote);
vi.mock("@/lib/ai/metering", async () => (await import("./mocks")).aiMock().metering);
vi.mock("@/lib/repo/edge-suggestions", async () => (await import("./mocks")).aiMock().edges);
vi.mock("@/app/api/telegram/route", async () => (await import("./mocks")).aiMock().owner);

const { processMessagingSession } = await import("@/lib/messaging");
const { itemRow } = await import("./mocks");

/**
 * AMBIGUITY. A note that could belong to two people is never guessed at — and it
 * is not argued about in chat either. It becomes a `note_subject` confirmation
 * the user resolves in the app, which is what lets a batch raise SEVERAL: the
 * old chat question could only ever have one open per chat, so the second
 * ambiguous note in a batch was quietly turned into a duplicate person.
 *
 * The invariants: ambiguity SAVES NOTHING until resolved (a note on the wrong
 * person is worse than a note that waits); the note body rides in the
 * confirmation so it can never be lost; every ambiguity gets its own row; and
 * the summary says how many are waiting rather than reading as a success.
 */
const AJAYS = [
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
  store.candidates = AJAYS;
  store.extraction = {
    contact: contact("Rohan"),
    isNoteAboutPerson: true,
    subjectName: "Rohan",
    noteBody: NOTE,
  };
});

describe("a note that matches two people", () => {
  it("raises a confirmation carrying the note, and attaches it to nobody", async () => {
    store.items.push(itemRow("text", { text: NOTE }));

    const summary = await runBatch();

    // WHY: nothing may be written to a person we are not sure about. The note
    // lives in the confirmation payload until the user picks, so it is neither
    // lost nor filed on a guess.
    expect(store.confirmations).toHaveLength(1);
    expect(store.confirmations[0].noteBody).toBe(NOTE);
    expect(store.confirmations[0].question).toContain("Which one did you mean?");
    expect(store.confirmations[0].options.map((option) => option.label)).toEqual([
      "Rohan Mehta",
      "Rohan Iyer",
    ]);
    expect(contactNames()).toEqual([]);
    expect(store.notes).toEqual([]);
    // A batch waiting on the user has not failed — it must not read as one.
    expect(summary).toContain(awaitingAnswerReply());
  });

  it("raises one per ambiguous note instead of inventing duplicate people", async () => {
    store.items.push(itemRow("text", { text: NOTE }));
    store.items.push(itemRow("text", { text: "Rohan also wants an intro to Sequoia" }));

    const summary = await runBatch();

    // WHY: the old chat question allowed exactly one per batch and silently
    // minted a NEW "Rohan" for the second — a duplicate person created by a
    // limitation of the transport, which the user then had to merge by hand.
    expect(store.confirmations).toHaveLength(2);
    expect(contactNames()).toEqual([]);
    expect(summary).toContain("2 notes need you to pick who they're about");
  });
});

describe("a note with one unambiguous match", () => {
  it("attaches silently — no confirmation, no duplicate person", async () => {
    store.candidates = [AJAYS[0]];
    store.extraction = { ...store.extraction, subjectName: "Rohan Mehta" };
    store.items.push(itemRow("text", { text: NOTE }));

    const summary = await runBatch();

    // WHY: asking about something we are sure of trains the user to click
    // through the inbox without reading it, which is how a real ambiguity gets
    // resolved wrong.
    expect(store.confirmations).toEqual([]);
    expect(store.notes).toMatchObject([{ contactId: "c1", kind: "text", body: NOTE }]);
    expect(contactNames()).toEqual([]);
    expect(summary).toContain("Saved Rohan Mehta");
  });
});
