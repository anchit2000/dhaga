import { describe, expect, it } from "vitest";
import {
  extractLinkToken,
  messagingLinkUrl,
  parseStartCommand,
  telegramLinkUrl,
  whatsappLinkUrl,
} from "@/utils/constants/messaging";

/**
 * SCAN-TO-LINK. The link token is the one step of messaging setup a person has
 * to carry by hand from Settings into a chat, and retyping it is where it goes
 * wrong. A QR removes the retype — but only if BOTH halves agree: the URL has
 * to deliver the token in the exact shape the inbound side will accept back.
 * These pin down that contract from both ends.
 */
describe("deep links", () => {
  it("builds a Telegram link whose payload Telegram will send back as /start", () => {
    expect(telegramLinkUrl("dhagaapp_bot", "ABCD2345")).toBe(
      "https://t.me/dhagaapp_bot?start=ABCD2345",
    );
  });

  it("tolerates a bot username written with the @ people copy from Telegram", () => {
    expect(telegramLinkUrl("@dhagaapp_bot", "ABCD2345")).toBe(
      "https://t.me/dhagaapp_bot?start=ABCD2345",
    );
  });

  it("strips everything but digits from a WhatsApp number", () => {
    // WHY: wa.me rejects +, spaces and dashes — and the number is configured by
    // a human copying it out of the Meta dashboard, where it has all three.
    expect(whatsappLinkUrl("+1 (555) 203-3476", "ABCD2345")).toBe(
      "https://wa.me/15552033476?text=ABCD2345",
    );
  });

  it("offers no link for a channel whose handle isn't configured", () => {
    // WHY: a QR that opens a chat with nobody is worse than no QR — the person
    // scans, sees an empty screen, and has no idea the deployment is misconfigured.
    expect(telegramLinkUrl(null, "ABCD2345")).toBeNull();
    expect(whatsappLinkUrl("", "ABCD2345")).toBeNull();
    expect(messagingLinkUrl({
      provider: "telegram",
      token: "ABCD2345",
      telegramBotUsername: null,
      whatsappNumber: "+15552033476",
    })).toBeNull();
  });

  it("has no link for a channel it doesn't know how to deep-link", () => {
    expect(messagingLinkUrl({
      provider: "signal",
      token: "ABCD2345",
      telegramBotUsername: "dhagaapp_bot",
      whatsappNumber: "+15552033476",
    })).toBeNull();
  });
});

describe("reading a token off an inbound message", () => {
  it("accepts the token a scanned Telegram link delivers", () => {
    // WHY: this is the whole point of the QR. Telegram turns ?start=TOKEN into
    // the literal message "/start TOKEN" — if this doesn't parse, scanning
    // silently does nothing and the user is told the chat isn't recognized.
    expect(extractLinkToken("/start ABCD2345")).toBe("ABCD2345");
  });

  it("accepts the /start@botname form Telegram uses in groups", () => {
    expect(extractLinkToken("/start@dhagaapp_bot ABCD2345")).toBe("ABCD2345");
  });

  it("still accepts a token typed by hand, in any case", () => {
    expect(extractLinkToken("ABCD2345")).toBe("ABCD2345");
    expect(extractLinkToken("  abcd2345 ")).toBe("ABCD2345");
  });

  it("treats a bare /start as a greeting, not a token", () => {
    // WHY: Telegram sends this on every first open. Reading it as a link
    // attempt would answer "that token isn't valid" to somebody who never
    // typed one.
    expect(extractLinkToken("/start")).toBeNull();
    expect(parseStartCommand("/start")).toEqual({ payload: null });
  });

  it("is not fooled by ordinary notes that merely mention start", () => {
    expect(parseStartCommand("start with the CTO intro")).toBeNull();
    expect(extractLinkToken("Met someone at the /start of the summit")).toBeNull();
  });

  it("rejects a payload that isn't a well-formed token", () => {
    expect(extractLinkToken("/start hello")).toBeNull();
    expect(extractLinkToken("/start ABCD234")).toBeNull(); // one char short
    expect(extractLinkToken("/start ABCD2I45")).toBeNull(); // I is not in the alphabet
  });
});
