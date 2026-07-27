import { describe, expect, it } from "vitest";

import { parseInbound as parseWhatsApp } from "../whatsapp-client";
import { parseTelegramUpdate } from "../telegram-client/parse";

/**
 * The parsers are the trust boundary between an untrusted provider webhook and
 * the rest of the pipeline: everything downstream assumes a NormalizedInbound-
 * Message. These tests pin the contract that (a) each provider's real payload
 * shape maps to the right content variant, (b) media/contacts are normalised
 * (WhatsApp's structured contact becomes a vCard the importer can read), and
 * (c) noise — status callbacks, non-message updates, malformed JSON — yields []
 * instead of throwing inside the webhook.
 */

describe("WhatsApp parseInbound", () => {
  const wrap = (messages: unknown[], contacts?: unknown[]): string =>
    JSON.stringify({ entry: [{ changes: [{ value: { contacts, messages } }] }] });

  it("maps a text message with sender profile + epoch-seconds timestamp", () => {
    const out = parseWhatsApp(
      wrap(
        [{ from: "15551230000", id: "wamid.T1", timestamp: "1717000000", type: "text", text: { body: "Met at DevCon" } }],
        [{ profile: { name: "Ada" }, wa_id: "15551230000" }],
      ),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      provider: "whatsapp",
      externalUserId: "15551230000",
      externalUserName: "Ada",
      messageId: "wamid.T1",
      timestamp: 1717000000 * 1000,
      content: { type: "text", text: "Met at DevCon" },
    });
  });

  it("synthesises a vCard from WhatsApp's structured contact JSON", () => {
    const out = parseWhatsApp(
      wrap([
        {
          from: "15551230000",
          id: "wamid.C1",
          type: "contacts",
          contacts: [
            {
              name: { formatted_name: "Grace Hopper" },
              org: { company: "US Navy", title: "Rear Admiral" },
              phones: [{ phone: "+1-202-555-0143" }],
              emails: [{ email: "grace@navy.mil" }],
            },
          ],
        },
      ]),
    );
    expect(out[0]?.content.type).toBe("contact_card");
    if (out[0]?.content.type !== "contact_card") throw new Error("expected contact_card");
    expect(out[0].content.displayName).toBe("Grace Hopper");
    expect(out[0].content.vcard).toContain("BEGIN:VCARD");
    expect(out[0].content.vcard).toContain("Grace Hopper");
  });

  it("treats a voice note as audio media carrying the media id", () => {
    const out = parseWhatsApp(
      wrap([{ from: "1", id: "wamid.V1", type: "voice", voice: { id: "MEDIA_V1", mime_type: "audio/ogg; codecs=opus" } }]),
    );
    expect(out[0]?.content).toMatchObject({ type: "media", media: { kind: "audio", id: "MEDIA_V1" } });
  });

  it("maps a location message", () => {
    const out = parseWhatsApp(
      wrap([{ from: "1", id: "wamid.L1", type: "location", location: { latitude: 37.42, longitude: -122.08, name: "HQ" } }]),
    );
    expect(out[0]?.content).toMatchObject({ type: "location", latitude: 37.42, longitude: -122.08, name: "HQ" });
  });

  it("degrades an unknown message type to 'unsupported' rather than throwing", () => {
    const out = parseWhatsApp(wrap([{ from: "1", id: "wamid.R1", type: "reaction", reaction: {} }]));
    expect(out[0]?.content).toEqual({ type: "unsupported", description: "reaction" });
  });

  it("ignores delivery-status callbacks (no user messages)", () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.x", status: "delivered" }] } }] }] });
    expect(parseWhatsApp(body)).toEqual([]);
  });

  it("drops a message missing the required from/id", () => {
    expect(parseWhatsApp(wrap([{ type: "text", text: { body: "orphan" } }]))).toEqual([]);
  });

  it("returns [] on malformed JSON", () => {
    expect(parseWhatsApp("not json")).toEqual([]);
  });
});

describe("Telegram parseTelegramUpdate", () => {
  const msg = (message: Record<string, unknown>): string => JSON.stringify({ update_id: 1, message });

  it("maps text and prefixes chat id for a globally-unique message id", () => {
    const out = parseTelegramUpdate(
      msg({ message_id: 10, from: { id: 42, username: "ada" }, chat: { id: 42 }, date: 1717000000, text: "Follow up next week" }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      provider: "telegram",
      externalUserId: "42",
      externalUserName: "ada",
      messageId: "42:10", // chatId:messageId — message_id alone is only per-chat unique
      timestamp: 1717000000 * 1000,
      content: { type: "text", text: "Follow up next week" },
    });
  });

  it("passes through a contact's own vCard when present", () => {
    const out = parseTelegramUpdate(
      msg({
        message_id: 11,
        from: { id: 42 },
        chat: { id: 42 },
        contact: { phone_number: "+1555", first_name: "Grace", last_name: "Hopper", vcard: "BEGIN:VCARD\r\nFN:Grace Hopper\r\nEND:VCARD" },
      }),
    );
    expect(out[0]?.content).toMatchObject({ type: "contact_card", displayName: "Grace Hopper", vcard: "BEGIN:VCARD\r\nFN:Grace Hopper\r\nEND:VCARD" });
  });

  it("synthesises a vCard when Telegram omits one", () => {
    const out = parseTelegramUpdate(
      msg({ message_id: 11, from: { id: 42 }, chat: { id: 42 }, contact: { phone_number: "+1555", first_name: "Grace", last_name: "Hopper", user_id: 99 } }),
    );
    if (out[0]?.content.type !== "contact_card") throw new Error("expected contact_card");
    expect(out[0].content.vcard).toContain("BEGIN:VCARD");
    expect(out[0].content.vcard).toContain("FN:Grace Hopper");
    expect(out[0].content.vcard).toContain("TEL;TYPE=CELL:+1555");
  });

  it("maps a voice note to audio media", () => {
    const out = parseTelegramUpdate(msg({ message_id: 12, from: { id: 42 }, chat: { id: 42 }, voice: { file_id: "AwACfile", mime_type: "audio/ogg" } }));
    expect(out[0]?.content).toMatchObject({ type: "media", media: { kind: "audio", id: "AwACfile" } });
  });

  it("picks the largest photo size for an image", () => {
    const out = parseTelegramUpdate(msg({ message_id: 13, from: { id: 42 }, chat: { id: 42 }, photo: [{ file_id: "thumb" }, { file_id: "full" }] }));
    expect(out[0]?.content).toMatchObject({ type: "media", media: { kind: "image", id: "full" } });
  });

  it("maps a venue location, taking the venue title as the name", () => {
    const out = parseTelegramUpdate(
      msg({ message_id: 14, from: { id: 42 }, chat: { id: 42 }, location: { latitude: 1.23, longitude: 4.56 }, venue: { title: "Blue Bottle" } }),
    );
    expect(out[0]?.content).toMatchObject({ type: "location", latitude: 1.23, longitude: 4.56, name: "Blue Bottle" });
  });

  it("handles edited_message the same as message", () => {
    const body = JSON.stringify({ update_id: 2, edited_message: { message_id: 15, from: { id: 42 }, chat: { id: 42 }, text: "edited" } });
    expect(parseTelegramUpdate(body)).toHaveLength(1);
  });

  it("ignores non-message updates (e.g. my_chat_member)", () => {
    expect(parseTelegramUpdate(JSON.stringify({ update_id: 3, my_chat_member: { chat: { id: 42 } } }))).toEqual([]);
  });

  it("drops a message missing from/chat/message_id", () => {
    expect(parseTelegramUpdate(msg({ text: "orphan" }))).toEqual([]);
  });

  it("returns [] on malformed JSON", () => {
    expect(parseTelegramUpdate("{oops")).toEqual([]);
  });
});
