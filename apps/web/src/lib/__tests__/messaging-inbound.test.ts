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

describe("normalizeContent (positional mapping)", () => {
  it("keeps a text message, and flags empty/whitespace text to be skipped", () => {
    expect(normalizeContent({ type: "text", text: "Met at the summit" })).toEqual({
      kind: "text",
      payload: { text: "Met at the summit" },
      skip: false,
    });
    expect(normalizeContent({ type: "text", text: "   " }).skip).toBe(true);
  });

  it("routes a contact card to the contact-setter kind", () => {
    const content: InboundMessageContent = { type: "contact_card", vcard: "BEGIN:VCARD\r\nEND:VCARD", displayName: "Ada" };
    expect(normalizeContent(content)).toEqual({
      kind: "contact_card",
      payload: { vcard: "BEGIN:VCARD\r\nEND:VCARD", displayName: "Ada" },
      skip: false,
    });
  });

  it("processes image and audio media (the kinds the processor acts on)", () => {
    const image: InboundMessageContent = { type: "media", media: { id: "m1", mimeType: "image/jpeg", kind: "image", filename: null }, caption: null };
    const audio: InboundMessageContent = { type: "media", media: { id: "m2", mimeType: "audio/ogg", kind: "audio", filename: null }, caption: null };
    expect(normalizeContent(image).kind).toBe("image");
    expect(normalizeContent(audio).kind).toBe("audio");
  });

  it("degrades video/document/sticker to an 'unsupported' item so a mixed batch still saves", () => {
    for (const kind of ["video", "document", "sticker"] as const) {
      const content: InboundMessageContent = { type: "media", media: { id: "x", mimeType: null, kind, filename: null }, caption: null };
      expect(normalizeContent(content).kind).toBe("unsupported");
    }
  });

  it("maps a location", () => {
    expect(normalizeContent({ type: "location", latitude: 1, longitude: 2, name: "Cafe" })).toEqual({
      kind: "location",
      payload: { latitude: 1, longitude: 2, name: "Cafe" },
      skip: false,
    });
  });
});
