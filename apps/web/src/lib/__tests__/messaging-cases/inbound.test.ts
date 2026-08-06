import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerTranscriptionProvider } from "@dhaga/core/src/transcription";
import type { InboundMessageContent } from "@dhaga/core/src/messaging";
import {
  ackFirstItemReply,
  alreadyLinkedReply,
  emptyMessageReply,
  emptySessionReply,
  linkedReply,
  notRecognizedReply,
  processingReply,
  voiceUnsupportedReply,
} from "@/utils/constants/messaging";
import { fakeClient, resetStore, store } from "./harness";

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

const { handleInboundMessage } = await import("@/lib/messaging");

/**
 * THE DOOR. Every way a message can arrive, driven through the provider's own
 * parseInbound so the wire → normalise → route path is the one under test.
 *
 * The rule these encode: a forwarded message either enters a batch or gets an
 * explanation. There is no third outcome — a silent drop is the failure mode
 * this whole surface exists to prevent, because the sender is standing at a
 * booth with no way to tell that nothing was saved.
 */
async function deliver(content: InboundMessageContent, id = `m${Math.random()}`): Promise<void> {
  const raw = JSON.stringify({ from: "chat-1", messages: [{ id, content }] });
  for (const message of fakeClient.parseInbound(raw)) {
    await handleInboundMessage(fakeClient, message);
  }
}

const media = (kind: "image" | "audio" | "video" | "document" | "sticker", mime: string | null) =>
  ({ id: `media-${kind}`, mimeType: mime, kind, filename: null }) as const;

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

describe("messages the pipeline cannot act on", () => {
  it("answers an empty message rather than opening an empty batch", async () => {
    await deliver({ type: "text", text: "   " });
    expect(store.sent).toEqual([emptyMessageReply()]);
    expect(store.items).toHaveLength(0);
  });

  it("refuses a voice note with the coming-soon reply while no STT provider exists", async () => {
    await deliver({ type: "media", media: media("audio", "audio/ogg"), caption: null });
    expect(store.sent).toEqual([
      "🎤 Voice notes aren't supported yet — coming soon! For now please type it, send a photo, or forward a contact.",
    ]);
    expect(store.sent[0]).toBe(voiceUnsupportedReply());
    // Nothing was stored: the sender knows immediately, not at DONE.
    expect(store.items).toHaveLength(0);
  });

  it("accepts the SAME voice note the moment a transcription provider registers", async () => {
    // The gate is the registry, not a flag — so this case fixes itself on the
    // day an STT provider is plugged in, with no edit to the messaging code.
    const dispose = registerTranscriptionProvider({
      id: "fake-stt",
      isConfigured: () => true,
      createClient: () => ({ transcribe: async () => ({ text: "hi", language: null }) }),
    });
    try {
      await deliver({ type: "media", media: media("audio", "audio/ogg"), caption: null });
    } finally {
      dispose();
    }
    expect(store.items.map((item) => item.kind)).toEqual(["audio"]);
    expect(store.sent).toEqual([ackFirstItemReply()]);
  });

  it.each(["video", "document", "sticker"] as const)("names a forwarded %s in its refusal", async (kind) => {
    await deliver({ type: "media", media: media(kind, null), caption: null });
    expect(store.sent[0]).toContain(kind);
    expect(store.items).toHaveLength(0);
  });
});

describe("messages that enter the batch", () => {
  it("keeps a photo WITH its caption, and acks only the first item", async () => {
    await deliver({ type: "media", media: media("image", "image/jpeg"), caption: "met at booth 12" });
    await deliver({ type: "text", text: "follow up in March" });
    expect(store.items.map((item) => item.kind)).toEqual(["image", "text"]);
    expect(store.items[0].payload).toMatchObject({ caption: "met at booth 12" });
    expect(store.sent).toEqual([ackFirstItemReply()]);
  });

  it("stores a contact card as structured data, with no AI parse at the door", async () => {
    await deliver({ type: "contact_card", vcard: "BEGIN:VCARD\r\nFN:Ada\r\nEND:VCARD", displayName: "Ada" });
    expect(store.items.map((item) => item.kind)).toEqual(["contact_card"]);
    expect(store.contactParseCalls).toBe(0);
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
});
