import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { mediaFailedNotice, photoUnreadableNotice } from "@/utils/constants/messaging";
import { contact, contactNames, fakeProvider, resetStore, store } from "./harness";

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

const { processMessagingSession } = await import("@/lib/messaging");
const { itemRow } = await import("./mocks");

/**
 * THE BATCH. What each accepted item actually becomes once DONE fires.
 *
 * The rules encoded here: a contact card goes through the STRUCTURED importer
 * (never the text parser), a photo goes through the vision path and — if it
 * isn't a card — is still read as a note rather than binned, and one bad item
 * costs only itself while the summary names what went wrong.
 */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);
const VCARD = "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nTEL;TYPE=CELL:+441234\r\nEND:VCARD";

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
  store.media = { data: JPEG, mimeType: "image/jpeg" };
});

describe("forwarded text", () => {
  it("becomes a contact with the message kept as its receipt", async () => {
    store.extraction = {
      contact: contact("Ada Lovelace"),
      isNoteAboutPerson: false,
      subjectName: "",
      noteBody: "",
    };
    store.items.push(itemRow("text", { text: "Ada Lovelace, Acme, ada@acme.com" }));

    const summary = await runBatch();
    expect(contactNames()).toEqual(["Ada Lovelace"]);
    expect(store.notes[0].body).toBe("Ada Lovelace, Acme, ada@acme.com");
    expect(summary).toContain("Saved Ada Lovelace");
  });
});

describe("forwarded contact card", () => {
  it("is imported from the vCard fields, never re-parsed as text", async () => {
    store.items.push(itemRow("contact_card", { vcard: VCARD, displayName: "Ada Lovelace" }));

    const summary = await runBatch();
    expect(contactNames()).toEqual(["Ada Lovelace"]);
    // The whole point of the structured path: no AI call, no lossy re-parse.
    expect(store.contactParseCalls).toBe(0);
    expect(store.notes[0].kind).toBe("capture_source");
    expect(summary).toContain("Saved Ada Lovelace");
  });

  it("reports a card it could not read instead of dropping it", async () => {
    store.items.push(itemRow("contact_card", { vcard: "BEGIN:VCARD\r\nEND:VCARD" }));
    const summary = await runBatch();
    expect(contactNames()).toEqual([]);
    expect(summary).toContain("contact card had no readable name");
  });
});

describe("forwarded photo", () => {
  it("scans a card and hangs the caption on the person it found", async () => {
    store.scan = { contact: contact("Grace Hopper"), rawText: "Grace Hopper\nNavy" };
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: "met at booth 12" }));

    const summary = await runBatch();
    expect(contactNames()).toEqual(["Grace Hopper"]);
    expect(store.notes.map((note) => note.body)).toEqual(["Grace Hopper\nNavy", "met at booth 12"]);
    // The caption is a human sentence, so it (and only it) is fact-extracted.
    expect(store.extractionCalls).toEqual([{ contactId: store.notes[1].contactId, body: "met at booth 12" }]);
    expect(summary).toContain("Saved Grace Hopper");
  });

  it("scans a Telegram photo, which arrives with no declared mime type", async () => {
    // Telegram sends photos without a mime; trusting the header alone silently
    // discarded every photo forwarded from Telegram, so the bytes decide.
    store.media = { data: JPEG, mimeType: "application/octet-stream" };
    store.scan = { contact: contact("Grace Hopper"), rawText: "Grace Hopper" };
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: null, filename: null }, caption: null }));

    await runBatch();
    expect(contactNames()).toEqual(["Grace Hopper"]);
  });

  it("reads a whiteboard photo as a note when there is no card on it", async () => {
    store.scan = { error: "Couldn't read a person off that photo" };
    store.photoText = "Q3 partners: Acme, Globex";
    store.extraction = { contact: contact("Acme partners"), isNoteAboutPerson: false, subjectName: "", noteBody: "" };
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));

    await runBatch();
    // The photo still lands in the graph — as text — instead of being binned.
    expect(store.notes[0].body).toBe("Q3 partners: Acme, Globex");
  });

  it("says a photo was unreadable rather than staying silent about it", async () => {
    store.scan = { error: "no" };
    store.photoText = null;
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));

    expect(await runBatch()).toContain(photoUnreadableNotice());
  });
});

describe("a bad item in a good batch", () => {
  it("costs only itself: the download failure is reported and the card still saves", async () => {
    store.media = null; // every download throws
    store.extraction = { contact: contact("Ada Lovelace"), isNoteAboutPerson: false, subjectName: "", noteBody: "" };
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));
    store.items.push(itemRow("text", { text: "Ada Lovelace, Acme" }));

    const summary = await runBatch();
    expect(summary).toContain(mediaFailedNotice());
    expect(contactNames()).toEqual(["Ada Lovelace"]);
  });
});
