import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboundMessageContent } from "@dhaga/core/src/messaging";
import {
  ackFirstItemReply,
  alreadyLinkedReply,
  emptySessionReply,
  linkedReply,
  notRecognizedReply,
  processingReply,
} from "@/utils/constants/messaging";
import { resetStore, store } from "./harness";
import { fakeClient } from "./provider";

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

const { handleInboundMessage } = await import("@/lib/messaging");

/**
 * THE DOOR. Every way a message can arrive, driven through the provider's own
 * parseInbound so the wire → normalise → route path is the one under test.
 *
 * The rule these encode: a forwarded message either enters a batch or gets an
 * explanation. There is no third outcome — a silent drop is the failure mode
 * this whole surface exists to prevent, because the sender is standing at a
 * booth with no way to tell that nothing was saved.
 *
 * The door does NOT read anything. Nothing is understood until DONE closes the
 * batch and it is planned as a whole (./accounting, ./attribution); refusals of
 * what can never be read live in ./refusals.
 */
async function deliver(content: InboundMessageContent, id = `m${Math.random()}`): Promise<void> {
  const raw = JSON.stringify({ from: "chat-1", messages: [{ id, content }] });
  for (const message of fakeClient.parseInbound(raw)) {
    await handleInboundMessage(fakeClient, message);
  }
}

beforeEach(() => {
  resetStore();
});

describe("an unlinked chat", () => {
  it("is told how to link instead of having its message swallowed", async () => {
    store.userId = null;
    await deliver({ type: "text", text: "Met Ada at the summit" });
    expect(store.sent).toEqual([notRecognizedReply()]);
    expect(store.items).toHaveLength(0);
  });

  it("links when the message is a valid token, and says so", async () => {
    store.userId = null;
    store.linkToken = "ABCD2345";
    await deliver({ type: "text", text: "ABCD2345" });
    expect(store.sent).toEqual([linkedReply()]);
  });

  it("links from a scanned QR, where Telegram sends the token as /start", async () => {
    // WHY: the QR's whole value is that nobody retypes the code. Telegram
    // delivers ?start=TOKEN as the literal message "/start TOKEN" — if the door
    // doesn't recognise that, scanning silently fails and the person is told
    // their chat isn't recognised while holding a valid code.
    store.userId = null;
    store.linkToken = "ABCD2345";
    await deliver({ type: "text", text: "/start ABCD2345" });
    expect(store.sent).toEqual([linkedReply()]);
  });

  it("does not read a bare /start as a bad token", async () => {
    // Telegram sends this on every first open, before any code exists.
    store.userId = null;
    await deliver({ type: "text", text: "/start" });
    expect(store.sent).toEqual([notRecognizedReply()]);
  });
});

describe("a /start from a chat that is already linked", () => {
  it("is answered, never stored as a note", async () => {
    // WHY: reopening the bot (or scanning the QR twice) sends /start again.
    // Treating it as content would file "/start ABCD2345" into the batch as a
    // note about somebody — capture noise the user never typed.
    await deliver({ type: "text", text: "/start ABCD2345" });
    expect(store.sent).toEqual([alreadyLinkedReply()]);
    expect(store.items).toHaveLength(0);
  });
});

describe("messages that enter the batch", () => {
  it("keeps a photo WITH its caption, and acks only the first item", async () => {
    const media = { id: "media-image", mimeType: "image/jpeg", kind: "image", filename: null } as const;
    await deliver({ type: "media", media, caption: "met at booth 12" });
    await deliver({ type: "text", text: "follow up in March" });
    expect(store.items.map((item) => item.kind)).toEqual(["image", "text"]);
    expect(store.items[0].payload).toMatchObject({ caption: "met at booth 12" });
    expect(store.sent).toEqual([ackFirstItemReply()]);
  });

  it("stores a contact card as structured data, with no model call at the door", async () => {
    // WHY: nothing is read until DONE, when the batch is planned as a whole in
    // ONE call. A per-item model call at the door is both the old cost profile
    // and the old one-message-at-a-time reading that mis-attributed notes.
    await deliver({ type: "contact_card", vcard: "BEGIN:VCARD\r\nFN:Ada\r\nEND:VCARD", displayName: "Ada" });
    expect(store.items.map((item) => item.kind)).toEqual(["contact_card"]);
    expect(store.planCalls).toEqual([]);
  });

  it("flushes on DONE, and says there is nothing to flush when the batch is empty", async () => {
    await deliver({ type: "text", text: "done" });
    expect(store.sent).toEqual([emptySessionReply()]);

    store.sent.length = 0;
    await deliver({ type: "text", text: "Met Ada" });
    store.sent.length = 0;
    await deliver({ type: "text", text: "DONE" });
    expect(store.sent).toEqual([processingReply(1)]);
    expect(store.deferred).toHaveLength(1); // the batch runs after the response
  });

  it("re-drives a batch that FAILED, because the failure reply promised it would", async () => {
    await deliver({ type: "text", text: "Met Ada" });
    store.statuses.push("failed"); // an earlier run failed; the items are intact
    store.sent.length = 0;

    await deliver({ type: "text", text: "DONE" });

    // WHY: a failed batch matches neither the open-session lookup nor the idle
    // sweeper, so nothing could ever pick it up again — while the bot's own
    // failure reply told the sender to reply DONE to try again. Their items sat
    // intact and permanently unreachable.
    expect(store.sent).toEqual([processingReply(1)]);
    expect(store.deferred).toHaveLength(1);
  });
});
