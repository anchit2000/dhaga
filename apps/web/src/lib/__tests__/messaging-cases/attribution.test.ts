import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { batchFullReply, MESSAGING_MAX_OPEN_ITEMS } from "@/utils/constants/messaging";
import { contact, contactNames, fakeClient, fakeProvider, resetStore, store } from "./harness";

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

const { handleInboundMessage, processMessagingSession } = await import("@/lib/messaging");
const { itemRow } = await import("./mocks");

/**
 * WHO A NOTE BELONGS TO — the decision a 24h capture window makes constantly and
 * the one nobody but the sender can check.
 *
 * A batch spanning a day can cover a dozen people. The rules encoded here: a
 * note that NAMES someone is routed on its own merits no matter whose card came
 * first; a note that names nobody falls back to the running contact but is
 * declared as an ASSUMPTION in the summary; and the batch refuses to grow past
 * the configured cap rather than quietly accumulating notes it will have to
 * guess about.
 */
const VCARD = "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nEND:VCARD";

function namesNobody() {
  return { contact: contact("Nobody"), isNoteAboutPerson: false, subjectName: "", noteBody: "" };
}

function namesPerson(name: string, body: string) {
  return { contact: contact(name), isNoteAboutPerson: true, subjectName: name, noteBody: body };
}

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

async function deliverText(text: string, id: string): Promise<void> {
  const raw = JSON.stringify({ from: "chat-1", messages: [{ id, content: { type: "text", text } }] });
  for (const message of fakeClient.parseInbound(raw)) {
    await handleInboundMessage(fakeClient, message);
  }
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
});

describe("a batch that spans several people", () => {
  it("routes a note that names someone else instead of filing it on the card that came first", async () => {
    // Ada's card establishes the cursor; the next note is explicitly about Bob.
    store.items.push(itemRow("contact_card", { vcard: VCARD, displayName: "Ada Lovelace" }));
    store.items.push(itemRow("text", { text: "Bob Chen is raising a seed round" }));
    store.extractionQueue = [namesPerson("Bob Chen", "is raising a seed round")];

    await runBatch();

    // WHY: filing Bob's note onto Ada — whose card merely happened to arrive
    // first — is silent data corruption the sender has no way to notice. Naming
    // a person must outrank the batch's running cursor, always.
    expect(contactNames()).toContain("Bob Chen");
    const bobId = [...store.contacts.entries()].find(([, name]) => name === "Bob Chen")?.[0];
    const adaId = [...store.contacts.entries()].find(([, name]) => name === "Ada Lovelace")?.[0];
    const bobNote = store.notes.find((note) => note.body.includes("seed round"));
    expect(bobNote?.contactId).toBe(bobId);
    expect(bobNote?.contactId).not.toBe(adaId);
  });

  it("attaches to the person already in the graph when the note names them", async () => {
    store.candidates = [{ id: "existing-bob", name: "Bob Chen", title: "CTO" }];
    store.items.push(itemRow("text", { text: "Bob Chen wants an intro" }));
    store.extractionQueue = [namesPerson("Bob Chen", "wants an intro")];

    const summary = await runBatch();

    expect(store.notes[0].contactId).toBe("existing-bob");
    expect(contactNames()).toEqual([]); // matched, never duplicated
    expect(summary).toContain("Bob Chen: 1 note that named them");
  });
});

describe("the summary states its assumptions", () => {
  it("declares a note that named nobody as ASSUMED, not as fact", async () => {
    store.items.push(itemRow("contact_card", { vcard: VCARD, displayName: "Ada Lovelace" }));
    store.items.push(itemRow("text", { text: "wants intros to fintech founders" }));
    store.extractionQueue = [namesNobody()];

    const summary = await runBatch();

    // WHY: this note could belong to anyone in the batch — it was filed on Ada
    // purely because she came last. A summary that reports that as settled is
    // the difference between a correctable guess and a silent error.
    expect(summary).toContain("ASSUMED");
    expect(summary).toContain("Ada Lovelace");
  });

  it("says nothing about attribution when the batch filed no notes", async () => {
    store.items.push(itemRow("contact_card", { vcard: VCARD, displayName: "Ada Lovelace" }));

    const summary = await runBatch();
    expect(summary).not.toContain("ASSUMED");
    expect(summary).not.toContain("Here's where each note went");
  });
});

describe("an unclosed batch", () => {
  it("refuses the item past the cap and says why, instead of swallowing it", async () => {
    for (let index = 0; index < MESSAGING_MAX_OPEN_ITEMS; index += 1) {
      await deliverText(`note ${index}`, `m${index}`);
    }
    expect(store.items).toHaveLength(MESSAGING_MAX_OPEN_ITEMS);

    store.sent.length = 0;
    await deliverText("one too many", "overflow");

    // WHY: the sender is standing in front of someone. An eleventh forward that
    // vanishes silently costs them a contact they believe they captured.
    expect(store.sent).toEqual([batchFullReply(MESSAGING_MAX_OPEN_ITEMS)]);
    expect(store.items).toHaveLength(MESSAGING_MAX_OPEN_ITEMS);
  });
});

describe("a batch re-driven after being cut short", () => {
  it("resumes from the unprocessed items rather than redoing the finished ones", async () => {
    const first = itemRow("text", { text: "Ada Lovelace, Acme" });
    store.items.push(first);
    store.items.push(itemRow("text", { text: "Bob Chen, Globex" }));
    (first as { processedAt: Date | null }).processedAt = new Date(); // already walked
    store.extraction = { ...namesNobody(), contact: contact("Bob Chen") };

    await runBatch();

    // WHY: a run killed mid-walk gets re-driven by the daily sweep. Without the
    // per-item stamp, every retry re-creates the contacts and notes the first
    // pass already wrote — duplicates the sender then has to merge by hand.
    expect(contactNames()).toEqual(["Bob Chen"]);
    expect(store.notes).toHaveLength(1);
  });
});
