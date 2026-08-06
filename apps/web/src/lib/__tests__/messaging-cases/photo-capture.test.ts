import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { UNNAMED_CONTACT_NAME } from "@/utils/constants/messaging";
import { contact, contactNames, fakeProvider, resetStore, store } from "./harness";

vi.mock("@/lib/db/request-scope", async () => (await import("./mocks")).requestScopeMock());
vi.mock("next/server", async () => (await import("./mocks")).afterMock());
vi.mock("@/lib/repo/messaging", async () => (await import("./mocks")).repoMessagingMock());
vi.mock("@/lib/repo/confirmations", async () => (await import("./mocks")).confirmationsMock());
vi.mock("@/lib/repo/contacts", async () => (await import("./mocks")).contactsMock());
vi.mock("@/lib/repo/notes", async () => (await import("./mocks")).notesMock());
vi.mock("@/lib/repo/embeddings", async () => (await import("./mocks")).embeddingsMock());
vi.mock("@/lib/repo/card-images", async () => (await import("./mocks")).cardImagesMock());
vi.mock("@/lib/repo/settings", async () => (await import("./mocks")).settingsMock());
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
 * Forwarding a PHOTO of something that is not a business card — a society
 * noticeboard, an office directory, a handwritten page.
 *
 * Reported from production: a forwarded noticeboard photo produced a contact
 * with a BLANK name, kept none of the photo itself, and then swallowed the
 * sender's next message ("…create a new contact") as a note on that blank
 * contact, from which fact extraction manufactured follow-ups nobody asked for.
 * Each case below pins one of those four behaviours.
 */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);

/** The photo carries an organisation's details and names no person. */
function noticeboard() {
  return {
    ...contact(""),
    company: "R10 Universe Society",
    emails: [{ value: "admin@r10universe.com", label: "admin" }],
    phones: [{ value: "7507626215", label: "Society office" }],
  };
}

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
  store.media = { data: JPEG, mimeType: "image/jpeg" };
  store.photoText = "Resale NOC and Mortgage NOC\nSociety office – 7507626215";
  store.extraction = {
    contact: noticeboard(),
    isNoteAboutPerson: false,
    subjectName: "",
    noteBody: "",
    isInstruction: false,
  };
});

describe("a photo the card scanner finds no person on", () => {
  /**
   * A contact saved with an empty name renders as a blank row and no search
   * will ever surface it again — the user cannot even find it to fix it. The
   * organisation printed on the noticeboard is the name a human would give it.
   */
  it("is named after the organisation, never left blank", async () => {
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));

    await runBatch();
    expect(contactNames()).toEqual(["R10 Universe Society"]);
  });

  it("falls back to a visible placeholder when there is no organisation either", async () => {
    store.extraction.contact = contact("");
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));

    await runBatch();
    expect(contactNames()).toEqual([UNNAMED_CONTACT_NAME]);
  });

  /**
   * The web photo-note and card-scan surfaces have always kept the photo. Over
   * messaging only the transcription survived, so nothing could be checked back
   * against the original — the exact complaint that opened this.
   */
  it("keeps the photo itself, hung off the note it was read into", async () => {
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));

    await runBatch();
    expect(store.cardImages).toHaveLength(1);
    expect(store.cardImages[0].contactId).toBe([...store.contacts.keys()][0]);
    // Hung off the NOTE, so deleting the note hard-deletes the photo with it.
    expect(store.cardImages[0].noteId).toBe(store.notes[0].id);
  });

  it("keeps no photo when the user has turned photo storage off", async () => {
    store.storePhotos = false;
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));

    await runBatch();
    expect(store.cardImages).toHaveLength(0);
    // The transcription still lands: the switch governs the photo, not the note.
    expect(store.notes).toHaveLength(1);
  });
});

describe("a message that instructs the bot rather than telling it something", () => {
  /**
   * "create a new contact" is a command aimed at us. Stored as a note it lands
   * in someone's timeline as noise AND hands fact extraction an imperative,
   * which reads it straight back as a follow-up the user then has to delete.
   */
  it("is not stored and not mined for follow-ups when a contact is already open", async () => {
    store.items.push(itemRow("image", { media: { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null }, caption: null }));
    store.items.push(itemRow("text", { text: "R10 universe society contact details, create a new contact" }));
    store.extraction.isInstruction = true;

    await runBatch();
    expect(contactNames()).toEqual(["R10 Universe Society"]);
    // Exactly one note — the photo's transcription. The instruction added none.
    expect(store.notes).toHaveLength(1);
    expect(store.notes[0].body).toContain("Resale NOC");
    // And nothing ran extraction over the instruction's text.
    expect(store.extractionCalls.map((call) => call.body)).not.toContain(
      "R10 universe society contact details, create a new contact",
    );
  });

  /**
   * Nothing may be dropped silently. An instruction that arrives with no
   * contact open is the only thing the sender sent, so it still establishes the
   * contact it names — it just isn't mined for facts, because an imperative
   * aimed at us contains none.
   */
  it("still establishes the contact it names when it is all the sender sent", async () => {
    store.items.push(itemRow("text", { text: "create a new contact for R10 Universe Society" }));
    store.extraction.isInstruction = true;

    await runBatch();
    expect(contactNames()).toEqual(["R10 Universe Society"]);
    expect(store.notes).toHaveLength(1);
    expect(store.extractionCalls).toHaveLength(0);
  });
});
