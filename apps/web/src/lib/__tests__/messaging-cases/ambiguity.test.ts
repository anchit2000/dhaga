import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import type { InboundMessageContent } from "@dhaga/core/src/messaging";
import { awaitingAnswerReply, questionAnsweredReply } from "@/utils/constants/messaging";
import { contact, contactNames, fakeClient, fakeProvider, resetStore, store } from "./harness";

vi.mock("@/lib/db/request-scope", async () => (await import("./mocks")).requestScopeMock());
vi.mock("next/server", async () => (await import("./mocks")).afterMock());
vi.mock("@/lib/repo/messaging", async () => (await import("./mocks")).repoMessagingMock());
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

const { handleInboundMessage, processMessagingSession } = await import("@/lib/messaging");
const { itemRow } = await import("./mocks");

/**
 * AMBIGUITY. A note that could belong to two people is never guessed at: the
 * bot asks in the chat and files the answer. The invariants under test:
 * ambiguity ASKS and saves nothing until answered (a note on the wrong person
 * is worse than a one-character question); a number OR a name files it; the
 * sender can never get stuck, because any non-answer releases the question,
 * saves the pending note under a new person rather than losing it, and lets the
 * releasing message through; and an expired question is not answerable, so a
 * stale "1" can't file a note on whoever happened to be first.
 */
const AJAYS = [
  { id: "c1", name: "Ajay Shrivastava", title: "STPI" },
  { id: "c2", name: "Ajay Kumar", title: "Infosys" },
];
const NOTE = "Met Ajay at the summit, he runs the fintech desk";

async function deliver(content: InboundMessageContent): Promise<void> {
  const raw = JSON.stringify({ from: "chat-1", messages: [{ id: `m${Math.random()}`, content }] });
  for (const message of fakeClient.parseInbound(raw)) {
    await handleInboundMessage(fakeClient, message);
  }
}

async function askTheQuestion(): Promise<void> {
  store.items.push(itemRow("text", { text: NOTE }));
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  store.items.length = 0;
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
  store.candidates = AJAYS;
  store.extraction = {
    contact: contact("Ajay"),
    isNoteAboutPerson: true,
    subjectName: "Ajay",
    noteBody: NOTE,
  };
});

describe("a note that matches two people", () => {
  it("asks in the chat, numbered, and saves nothing yet", async () => {
    await askTheQuestion();

    const question = store.sent[0];
    expect(question).toContain("Which one did you mean?");
    expect(question).toContain("1. Ajay Shrivastava (STPI)");
    expect(question).toContain("2. Ajay Kumar (Infosys)");
    expect(contactNames()).toEqual([]);
    expect(store.notes).toEqual([]);
    expect(store.questions).toHaveLength(1);
    // The batch summary must not read as a failure — it is waiting on a reply.
    expect(store.sent.at(-1)).toContain(awaitingAnswerReply());
  });

  it("attaches to nobody but the person the number picked", async () => {
    await askTheQuestion();
    store.sent.length = 0;

    await deliver({ type: "text", text: "2" });
    expect(store.notes).toEqual([{ contactId: "c2", kind: "text", body: NOTE }]);
    expect(contactNames()).toEqual([]); // no duplicate person was minted
    expect(store.sent).toEqual([questionAnsweredReply("Ajay Kumar")]);
    expect(store.questions).toHaveLength(0);
  });

  it("accepts a name instead of a number", async () => {
    await askTheQuestion();
    store.sent.length = 0;

    await deliver({ type: "text", text: "Shrivastava" });
    expect(store.notes).toEqual([{ contactId: "c1", kind: "text", body: NOTE }]);
    expect(store.sent).toEqual([questionAnsweredReply("Ajay Shrivastava")]);
  });

  it("takes 'new' as an answer and mints the person the note is about", async () => {
    await askTheQuestion();
    store.sent.length = 0;

    await deliver({ type: "text", text: "new" });
    expect(contactNames()).toEqual(["Ajay"]);
    expect(store.notes.map((note) => note.body)).toEqual([NOTE]);
    expect(store.sent).toEqual([questionAnsweredReply("Ajay")]);
  });
});

describe("a reply that is not an answer", () => {
  it("releases the question, keeps the note, and still handles the new message", async () => {
    await askTheQuestion();
    store.sent.length = 0;

    await deliver({ type: "text", text: "also met Priya from Zerodha" });

    // The pending note is saved (never dropped) and the sender is told where.
    expect(contactNames()).toEqual(["Ajay"]);
    expect(store.notes.map((note) => note.body)).toEqual([NOTE]);
    expect(store.sent[0]).toContain("saved that note under a new person, Ajay");
    // ...and the message that released it went into the batch as content.
    expect(store.items.map((item) => item.kind)).toEqual(["text"]);
    expect(store.questions).toHaveLength(0);
  });

  it("does not let a stale number answer an expired question", async () => {
    await askTheQuestion();
    store.questions[0].expiresAt = new Date(Date.now() - 1000);
    store.sent.length = 0;

    await deliver({ type: "text", text: "1" });
    // "1" is NOT filed on Ajay Shrivastava an hour later.
    expect(store.notes.every((note) => note.contactId !== "c1")).toBe(true);
    expect(contactNames()).toEqual(["Ajay"]);
  });
});

describe("a note with one unambiguous match", () => {
  it("attaches silently — no question, no duplicate person", async () => {
    store.candidates = [AJAYS[0]];
    store.extraction = { ...store.extraction, subjectName: "Ajay Shrivastava" };
    await askTheQuestion();

    expect(store.questions).toHaveLength(0);
    expect(store.notes).toEqual([{ contactId: "c1", kind: "text", body: NOTE }]);
    expect(contactNames()).toEqual([]);
    expect(store.sent.at(-1)).toContain("Saved Ajay Shrivastava");
  });
});
