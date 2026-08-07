import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { UNNAMED_CONTACT_NAME } from "@/utils/constants/messaging";
import { contact, contactNames, outcomeFor, resetStore, store } from "./harness";
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
 * FORWARDING A PHOTO — a business card, or a society noticeboard, an office
 * directory, a handwritten page.
 *
 * Reported from production: a forwarded noticeboard photo produced a contact
 * with a BLANK name, kept none of the photo itself, and then swallowed the
 * sender's next message ("…create a new contact") as a note on that blank
 * contact, from which fact extraction manufactured follow-ups nobody asked for.
 *
 * The rule that fixes it: a photo is a READER here, not an attributor. The card
 * scanner turns it into text and stops — a successful scan no longer seizes the
 * batch's subject, which is what let the next message be misread. The planner
 * decides who the photo is about, having seen the messages around it too.
 */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);
const NOTICEBOARD = "Resale NOC and Mortgage NOC\nSociety office - 9999900102";
const SOCIETY = "Maple Court Society";

function photo(caption: string | null) {
  const media = { id: "m1", kind: "image", mimeType: "image/jpeg", filename: null };
  return itemRow("image", { media, caption });
}

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
  store.media = { data: JPEG, mimeType: "image/jpeg" };
});

describe("a photo with a card on it", () => {
  it("hands the planner what was printed plus the caption, and keeps the photo", async () => {
    store.scan = { contact: contact("Grace Hopper"), rawText: "Grace Hopper\nNavy" };
    store.items.push(photo("met at booth 12"));
    store.plan = plan({
      people: [
        person({ name: "Grace Hopper", seqs: [1], notes: [{ body: "met at booth 12", seqs: [1] }] }),
      ],
    });

    await runBatch();

    // WHY: the scan reads, it does not decide. Its text and the caption go to the
    // planner as ONE message, so whoever the rest of the batch is about is still
    // decided with this in view rather than by whichever item scanned first.
    expect(store.planCalls[0].items[0].text).toBe("Grace Hopper\nNavy\n\nmet at booth 12");
    expect(contactNames()).toEqual(["Grace Hopper"]);
    // Hung off the NOTE, so deleting the note hard-deletes the photo with it.
    expect(store.cardImages).toEqual([
      { contactId: [...store.contacts.keys()][0], noteId: store.notes[0].id, count: 1 },
    ]);
  });

  it("keeps no photo when the user has turned photo storage off", async () => {
    store.storePhotos = false;
    store.scan = { contact: contact("Grace Hopper"), rawText: "Grace Hopper" };
    store.items.push(photo(null));
    store.plan = plan({
      people: [person({ name: "Grace Hopper", seqs: [1], notes: [{ body: "Grace Hopper", seqs: [1] }] })],
    });

    await runBatch();

    // The transcription still lands: the switch governs the photo, not the note.
    expect(store.cardImages).toEqual([]);
    expect(store.notes).toHaveLength(1);
  });
});

describe("a photo of something that is not a person", () => {
  it("is read as text and named after what is printed on it, never left blank", async () => {
    store.scan = { error: "no card on that photo" };
    store.photoText = NOTICEBOARD;
    store.items.push(photo(null));
    store.plan = plan({
      people: [person({ name: SOCIETY, seqs: [1], notes: [{ body: NOTICEBOARD, seqs: [1] }] })],
    });

    await runBatch();

    // WHY: a contact saved with an empty name renders as a blank row that no
    // search will ever surface again — the user cannot even find it to fix it.
    expect(store.planCalls[0].items[0].text).toBe(NOTICEBOARD);
    expect(contactNames()).toEqual([SOCIETY]);
    expect(contactNames()).not.toContain(UNNAMED_CONTACT_NAME);
  });

  it("reads the follow-up 'create a new contact' as being about that photo", async () => {
    store.scan = { error: "no card on that photo" };
    store.photoText = NOTICEBOARD;
    store.items.push(photo(null));
    store.items.push(itemRow("text", { text: "Maple Court society contact details, create a new contact" }));
    store.plan = plan({
      people: [person({ name: SOCIETY, seqs: [1, 2], notes: [{ body: NOTICEBOARD, seqs: [1] }] })],
    });

    await runBatch();

    // WHY: this is the production report. Stored as a note the directive lands in
    // a timeline as noise AND hands fact extraction an imperative, which reads
    // straight back as a follow-up the user has to delete. It is neither stored
    // nor dropped — it is folded into the person it concerned.
    expect(contactNames()).toEqual([SOCIETY]);
    expect(store.notes.map((note) => note.body)).toEqual([NOTICEBOARD]);
    expect(outcomeFor(2)?.kind).toBe("directive");
    expect(store.extractionCalls.map((call) => call.body)).toEqual([NOTICEBOARD]);
  });
});
