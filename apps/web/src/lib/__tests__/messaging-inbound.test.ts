import { describe, expect, it } from "vitest";
import type { InboundMessageContent } from "@dhaga/core/src/messaging";

import { normalizeContent } from "@/lib/messaging/normalize";
import { isDoneDelimiter, looksLikeLinkToken } from "@/utils/constants/messaging";

/**
 * These three pure functions decide the whole inbound routing:
 *  - isDoneDelimiter: whether a message CLOSES the batch (vs. is a note). A miss
 *    either strands a batch forever or eats a real note, so case/whitespace
 *    robustness and NOT matching near-misses ("done now", "donate") both matter.
 *  - looksLikeLinkToken: whether an UNLINKED sender's message is an account-link
 *    token (vs. a note). A false positive would try to link on a normal note.
 *  - normalizeContent: the positional rule — which forwarded content becomes a
 *    contact-setter (contact_card / image) vs. a note vs. an ignored attachment.
 */

describe("isDoneDelimiter", () => {
  it.each(["done", "DONE", "  Done  ", "/done", "finish", "Finished", "END"])(
    "treats %j as a batch-closing delimiter",
    (text) => expect(isDoneDelimiter(text)).toBe(true),
  );

  it.each(["done now", "are you done?", "donate", "finished the report", "", "d"])(
    "does NOT treat %j as a delimiter (it's a note, not the close command)",
    (text) => expect(isDoneDelimiter(text)).toBe(false),
  );
});

describe("looksLikeLinkToken", () => {
  it("accepts an 8-char token from the unambiguous alphabet, case-insensitively", () => {
    expect(looksLikeLinkToken("ABCD2345")).toBe(true);
    expect(looksLikeLinkToken("abcd2345")).toBe(true);
    expect(looksLikeLinkToken("  ABCD2345  ")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(looksLikeLinkToken("ABCD234")).toBe(false); // 7
    expect(looksLikeLinkToken("ABCD23456")).toBe(false); // 9
  });

  it("rejects characters excluded from the alphabet (0/1/O/I/L)", () => {
    expect(looksLikeLinkToken("ABCD01IL")).toBe(false);
  });

  it("does not misfire on an ordinary short note", () => {
    expect(looksLikeLinkToken("hi there")).toBe(false);
    expect(looksLikeLinkToken("call him")).toBe(false); // 8 chars but has a space + out-of-alphabet
  });
});

/** Transcription registered / not — the only axis normalizeContent branches on. */
const WITH_STT = { transcription: true };
const NO_STT = { transcription: false };

describe("normalizeContent (positional mapping)", () => {
  it("keeps a text message, and REFUSES empty/whitespace text", () => {
    expect(normalizeContent({ type: "text", text: "Met at the summit" }, NO_STT)).toEqual({
      accepted: true,
      kind: "text",
      payload: { text: "Met at the summit" },
    });
    // An empty forward must be answered, not stored as a dud item.
    expect(normalizeContent({ type: "text", text: "   " }, NO_STT)).toEqual({
      accepted: false,
      rejection: "empty",
      description: "text",
    });
  });

  it("routes a contact card to the contact-setter kind", () => {
    const content: InboundMessageContent = { type: "contact_card", vcard: "BEGIN:VCARD\r\nEND:VCARD", displayName: "Ada" };
    expect(normalizeContent(content, NO_STT)).toEqual({
      accepted: true,
      kind: "contact_card",
      payload: { vcard: "BEGIN:VCARD\r\nEND:VCARD", displayName: "Ada" },
    });
  });

  it("keeps a photo AND its caption (the caption is a note about the person)", () => {
    const image: InboundMessageContent = {
      type: "media",
      media: { id: "m1", mimeType: "image/jpeg", kind: "image", filename: null },
      caption: "met at the summit",
    };
    expect(normalizeContent(image, NO_STT)).toEqual({
      accepted: true,
      kind: "image",
      payload: { media: image.type === "media" ? image.media : null, caption: "met at the summit" },
    });
  });

  it("accepts audio ONLY while a transcription provider is registered", () => {
    const audio: InboundMessageContent = { type: "media", media: { id: "m2", mimeType: "audio/ogg", kind: "audio", filename: null }, caption: null };
    // No provider: refused with a reason, so the sender is told the same minute
    // — and this branch flips on its own the day a provider is registered.
    expect(normalizeContent(audio, NO_STT)).toMatchObject({
      accepted: false,
      rejection: "voice_unsupported",
    });
    expect(normalizeContent(audio, WITH_STT)).toMatchObject({ accepted: true, kind: "audio" });
  });

  it("refuses video/document/sticker by name, so the reply can say what it was", () => {
    for (const kind of ["video", "document", "sticker"] as const) {
      const content: InboundMessageContent = { type: "media", media: { id: "x", mimeType: null, kind, filename: null }, caption: null };
      expect(normalizeContent(content, WITH_STT)).toEqual({
        accepted: false,
        rejection: "unsupported_attachment",
        description: kind,
      });
    }
  });

  it("never echoes a useless 'unknown' back at the sender", () => {
    expect(normalizeContent({ type: "unsupported", description: "unknown" }, NO_STT)).toEqual({
      accepted: false,
      rejection: "unsupported_attachment",
      description: "message like that",
    });
  });

  it("maps a location", () => {
    expect(normalizeContent({ type: "location", latitude: 1, longitude: 2, name: "Cafe" }, NO_STT)).toEqual({
      accepted: true,
      kind: "location",
      payload: { latitude: 1, longitude: 2, name: "Cafe" },
    });
  });
});
