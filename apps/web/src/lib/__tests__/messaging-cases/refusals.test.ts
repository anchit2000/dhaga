import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerTranscriptionProvider } from "@dhaga/core/src/transcription";
import type { InboundMessageContent } from "@dhaga/core/src/messaging";
import {
  ackFirstItemReply,
  emptyMessageReply,
  voiceUnsupportedReply,
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
 * WHAT THE DOOR REFUSES, and why it refuses it THERE. Split from ./inbound (the
 * accept path) per the 150-line rule; same invariant, opposite half.
 *
 * A message the pipeline can never act on is answered on arrival, not at DONE.
 * The sender is standing in front of someone: told now, they can retype it or
 * photograph the card instead; told hours later when the batch closes, the
 * moment is gone. So nothing is stored on the hope it becomes readable later,
 * and the refusal names the thing it refused.
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
