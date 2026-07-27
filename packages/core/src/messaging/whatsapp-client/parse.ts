/**
 * Parse a WhatsApp Cloud API webhook body into NormalizedInboundMessage[].
 *
 * Defensive by construction: the payload is untrusted JSON, so it is read as
 * `unknown` and narrowed field-by-field (see ./narrow) — a shape we don't
 * recognise degrades to an "unsupported" content variant (or is skipped)
 * rather than throwing. Status callbacks (`value.statuses`) and changes without
 * `messages` contribute nothing. WhatsApp sends STRUCTURED contact JSON, not a
 * vCard, so a shared contact is synthesised into a vCard 3.0 string (./vcard).
 */
import type { InboundMediaRef, InboundMessageContent, NormalizedInboundMessage } from "../types";
import { asArray, asNumber, asRecord, asString } from "./narrow";
import { synthesizeVCard } from "./vcard";

/** Epoch seconds (string or number) → ms; null when absent or non-numeric. */
function timestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const seconds = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

/** Build a media content variant, or "unsupported" if the media has no id. */
function mediaContent(
  kind: InboundMediaRef["kind"],
  source: Record<string, unknown> | null,
  fallbackType: string,
  opts: { caption: boolean; filename: boolean },
): InboundMessageContent {
  if (!source) return { type: "unsupported", description: fallbackType };
  const id = asString(source.id);
  if (!id) return { type: "unsupported", description: fallbackType };
  const media: InboundMediaRef = {
    id,
    mimeType: asString(source.mime_type),
    kind,
    filename: opts.filename ? asString(source.filename) : null,
  };
  return { type: "media", media, caption: opts.caption ? asString(source.caption) : null };
}

/** Map one message object to its content variant by `message.type`. */
function messageContent(message: Record<string, unknown>): InboundMessageContent {
  const type = asString(message.type) ?? "unknown";
  switch (type) {
    case "text": {
      const text = asString(asRecord(message.text)?.body);
      return text === null ? { type: "unsupported", description: type } : { type: "text", text };
    }
    case "contacts": {
      const first = asRecord(asArray(message.contacts)[0]);
      if (!first) return { type: "unsupported", description: type };
      return {
        type: "contact_card",
        vcard: synthesizeVCard(first),
        displayName: asString(asRecord(first.name)?.formatted_name),
      };
    }
    case "image":
      return mediaContent("image", asRecord(message.image), type, { caption: true, filename: false });
    case "audio":
    case "voice":
      return mediaContent("audio", asRecord(message.audio) ?? asRecord(message.voice), type, {
        caption: false,
        filename: false,
      });
    case "document":
      return mediaContent("document", asRecord(message.document), type, { caption: true, filename: true });
    case "video":
      return mediaContent("video", asRecord(message.video), type, { caption: true, filename: false });
    case "sticker":
      return mediaContent("sticker", asRecord(message.sticker), type, { caption: false, filename: false });
    case "location": {
      const loc = asRecord(message.location);
      const latitude = asNumber(loc?.latitude);
      const longitude = asNumber(loc?.longitude);
      if (latitude === null || longitude === null) return { type: "unsupported", description: type };
      return { type: "location", latitude, longitude, name: asString(loc?.name) };
    }
    default:
      return { type: "unsupported", description: type };
  }
}

/** Normalise one message; null when it lacks the required `from`/`id`. */
function normalizeMessage(
  message: Record<string, unknown>,
  externalUserName: string | null,
): NormalizedInboundMessage | null {
  const externalUserId = asString(message.from);
  const messageId = asString(message.id);
  if (!externalUserId || !messageId) return null;
  return {
    provider: "whatsapp",
    externalUserId,
    externalUserName,
    messageId,
    timestamp: timestampMs(message.timestamp),
    content: messageContent(message),
  };
}

export function parseInbound(rawBody: string): NormalizedInboundMessage[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return [];
  }
  const body = asRecord(parsed);
  if (!body) return [];

  const messages: NormalizedInboundMessage[] = [];
  for (const entryRaw of asArray(body.entry)) {
    for (const changeRaw of asArray(asRecord(entryRaw)?.changes)) {
      const value = asRecord(asRecord(changeRaw)?.value);
      if (!value) continue;
      // Ignore status callbacks and any change without user messages.
      const rawMessages = asArray(value.messages);
      if (rawMessages.length === 0) continue;
      const contact = asRecord(asArray(value.contacts)[0]);
      const externalUserName = asString(asRecord(contact?.profile)?.name);
      for (const messageRaw of rawMessages) {
        const message = asRecord(messageRaw);
        if (!message) continue;
        const normalized = normalizeMessage(message, externalUserName);
        if (normalized) messages.push(normalized);
      }
    }
  }
  return messages;
}
