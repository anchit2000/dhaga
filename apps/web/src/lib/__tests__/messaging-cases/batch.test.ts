import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMessagingProvider } from "@dhaga/core/src/messaging";
import { unreadableItemNotice } from "@/utils/constants/messaging";
import { contactNames, outcomeFor, resetStore, store } from "./harness";
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
 * THE BATCH. What each accepted item becomes on its way to the planner, and what
 * the plan is allowed to do with it once it comes back.
 *
 * The rules encoded here: every item is DERIVED to text and handed to the
 * planner with its position intact, because the batch is only readable as a
 * whole; a contact card's parsed PROFILE is what gets written, never the
 * planner's re-reading of it, so labelled fields (work vs. mobile) survive — and
 * only for a NEW person, because a forwarded card must never overwrite a contact
 * the user has curated; and an item nothing can be read out of is REPORTED
 * rather than dropped. (What each verdict then becomes is ./accounting.)
 */
const VCARD = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Ada Lovelace",
  "ORG:Acme;Research",
  "TITLE:Analyst",
  "TEL;TYPE=WORK:+44100",
  "TEL;TYPE=CELL:+44200",
  "END:VCARD",
].join("\r\n");

async function runBatch(): Promise<string> {
  await processMessagingSession("user-1", { id: "session-1", provider: "fake", externalId: "chat-1" });
  return store.sent.at(-1) ?? "";
}

beforeEach(() => {
  resetStore();
  registerMessagingProvider(fakeProvider);
});

describe("a forwarded text", () => {
  it("reaches the planner verbatim, with the position it arrived in", async () => {
    store.items.push(itemRow("text", { text: "Ada Lovelace, Acme, ada@acme.com" }));
    store.plan = plan({
      people: [
        person({
          name: "Ada Lovelace",
          seqs: [1],
          notes: [{ body: "Ada Lovelace, Acme, ada@acme.com", seqs: [1] }],
        }),
      ],
    });

    await runBatch();

    // WHY: the seq is the only handle the plan has on a message — it is what
    // ties a stored note back to what produced it and what makes a message the
    // plan forgot detectable at all. Losing or reordering it silently detaches
    // every receipt in the batch.
    expect(store.planCalls[0].items.map(({ seq, kind, text }) => ({ seq, kind, text }))).toEqual([
      { seq: 1, kind: "text", text: "Ada Lovelace, Acme, ada@acme.com" },
    ]);
    expect(contactNames()).toEqual(["Ada Lovelace"]);
    expect(store.notes[0].body).toBe("Ada Lovelace, Acme, ada@acme.com");
  });
});

describe("a forwarded contact card", () => {
  it("is written from its parsed fields, keeping the labels the sender's phone gave", async () => {
    store.items.push(itemRow("contact_card", { vcard: VCARD, displayName: "Ada Lovelace" }));
    store.plan = plan({ people: [person({ name: "Ada Lovelace", seqs: [1] })] });

    await runBatch();

    // WHY: "which number is her mobile and which is her desk" is stated by the
    // card and unrecoverable from a text round trip. The planner decides WHO the
    // card is about; the structured profile is what is stored.
    expect(store.planCalls[0].items[0].kind).toBe("contact_card");
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0].phones).toEqual([
      { value: "+44100", label: "Work", note: null },
      { value: "+44200", label: "Mobile", note: null },
    ]);
    expect(store.profiles[0].positions[0]).toMatchObject({ title: "Analyst", company: "Acme" });
    expect(contactNames()).toEqual(["Ada Lovelace"]);
  });

  it("never overwrites the contact it was matched to", async () => {
    store.candidates = [{ id: "existing-ada", name: "Ada Lovelace", title: "CTO" }];
    store.items.push(itemRow("contact_card", { vcard: VCARD, displayName: "Ada Lovelace" }));
    store.items.push(itemRow("text", { text: "wants an intro to Sequoia" }));
    store.plan = plan({
      people: [
        person({
          name: "Ada Lovelace",
          existingContactId: "existing-ada",
          seqs: [1],
          notes: [{ body: "wants an intro to Sequoia", seqs: [2] }],
        }),
      ],
    });

    await runBatch();

    // WHY: a forwarded card is a stale snapshot from somebody else's phone. Its
    // fields must never replace what the user has curated — the batch adds the
    // note and leaves the person alone. (This states the plan directly; whether
    // a real planner can reach it depends on what a card DERIVES to, which is
    // ../messaging/process-session/derive.ts's business, not this rule's.)
    expect(store.profiles).toEqual([]);
    expect(contactNames()).toEqual([]);
    expect(store.notes).toMatchObject([{ contactId: "existing-ada" }]);
  });

  it("reports a card it could not read instead of dropping it", async () => {
    store.items.push(itemRow("contact_card", { vcard: "BEGIN:VCARD\r\nEND:VCARD" }));

    const summary = await runBatch();

    expect(contactNames()).toEqual([]);
    expect(outcomeFor(1)).toMatchObject({ kind: "unreadable", detail: { reason: "empty" } });
    expect(summary).toContain(unreadableItemNotice());
  });
});
