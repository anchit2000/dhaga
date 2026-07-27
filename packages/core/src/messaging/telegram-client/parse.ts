/**
 * Telegram Update -> NormalizedInboundMessage parsing. Pure, network-free, no
 * logging (contents are contact PII). Defensive (all fields optional + optional
 * chaining): a malformed/unexpected payload degrades to [] or `unsupported`,
 * never a throw.
 */

import type {
  InboundMediaRef,
  InboundMessageContent,
  NormalizedInboundMessage,
} from "../types";
import type {
  TelegramContact,
  TelegramFile,
  TelegramMessage,
  TelegramUpdate,
  TelegramUser,
} from "./wire";

/** Stable provider id shared by the client, provider registration, and parsed messages. */
export const TELEGRAM_PROVIDER_ID = "telegram";

/** Envelope/metadata keys - skipped when naming the first content key of an unsupported payload. */
const METADATA_KEYS: ReadonlySet<string> = new Set([
  "message_id", "from", "chat", "date", "edit_date", "caption", "message_thread_id",
  "sender_chat", "reply_to_message", "via_bot", "forward_origin", "forward_date",
  "media_group_id", "entities", "caption_entities", "link_preview_options", "author_signature",
]);

export function parseTelegramUpdate(rawBody: string): NormalizedInboundMessage[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const update = parsed as TelegramUpdate;
  // Only message / edited_message carry a forwarded contact; ignore every other update kind.
  const message = update.message ?? update.edited_message;
  if (!message) return [];
  const normalized = normalizeMessage(message);
  return normalized ? [normalized] : [];
}

function normalizeMessage(m: TelegramMessage): NormalizedInboundMessage | null {
  const fromId = m.from?.id;
  const chatId = m.chat?.id;
  const messageId = m.message_id;
  if (fromId === undefined || chatId === undefined || messageId === undefined) return null;
  return {
    provider: TELEGRAM_PROVIDER_ID,
    externalUserId: String(fromId),
    externalUserName: resolveUserName(m.from),
    // message_id is per-chat; prefix chat id so it is globally unique for idempotency.
    messageId: `${chatId}:${messageId}`,
    timestamp: m.date ? m.date * 1000 : null,
    content: mapContent(m),
  };
}

function resolveUserName(from: TelegramUser | undefined): string | null {
  if (!from) return null;
  return from.username ?? ([from.first_name, from.last_name].filter(Boolean).join(" ") || null);
}

function mapContent(m: TelegramMessage): InboundMessageContent {
  if (typeof m.text === "string") return { type: "text", text: m.text };
  if (m.contact) return contactCard(m.contact);

  const caption = m.caption ?? null;
  const media: InboundMediaRef | null | undefined =
    (m.voice && toMediaRef("audio", m.voice.file_id, m.voice.mime_type ?? "audio/ogg", null)) ||
    (m.audio && toMediaRef("audio", m.audio.file_id, m.audio.mime_type ?? null, m.audio.file_name ?? null)) ||
    (m.photo && toMediaRef("image", largestPhoto(m.photo), null, null)) ||
    (m.document &&
      toMediaRef(documentKind(m.document.mime_type), m.document.file_id, m.document.mime_type ?? null, m.document.file_name ?? null)) ||
    (m.video && toMediaRef("video", m.video.file_id, m.video.mime_type ?? null, m.video.file_name ?? null)) ||
    (m.sticker && toMediaRef("sticker", m.sticker.file_id, m.sticker.mime_type ?? null, null));
  if (media) return { type: "media", media, caption };

  if (m.location && typeof m.location.latitude === "number" && typeof m.location.longitude === "number") {
    return {
      type: "location",
      latitude: m.location.latitude,
      longitude: m.location.longitude,
      name: m.venue?.title ?? null,
    };
  }

  return { type: "unsupported", description: firstContentKey(m) };
}

function contactCard(contact: TelegramContact): InboundMessageContent {
  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null;
  const vcard =
    contact.vcard && contact.vcard.trim().length > 0 ? contact.vcard : synthesizeVCard(contact);
  return { type: "contact_card", vcard, displayName };
}

/**
 * Minimal vCard 3.0 from Telegram's structured contact fields, used only when
 * Telegram omits `vcard`. NOTE: WhatsApp will need the same synthesis - extract
 * a shared core helper once the second caller lands (deferred on purpose; no
 * cross-file coupling now).
 */
function synthesizeVCard(contact: TelegramContact): string {
  const first = contact.first_name ?? "";
  const last = contact.last_name ?? "";
  const fullName = [first, last].filter(Boolean).join(" ") || "Unknown";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${last};${first};;;`, `FN:${fullName}`];
  if (contact.phone_number) lines.push(`TEL;TYPE=CELL:${contact.phone_number}`);
  if (contact.user_id !== undefined) lines.push(`NOTE:Telegram user_id ${contact.user_id}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function largestPhoto(photos: TelegramFile[]): string | undefined {
  return photos[photos.length - 1]?.file_id;
}

function toMediaRef(
  kind: InboundMediaRef["kind"],
  fileId: string | undefined,
  mimeType: string | null,
  filename: string | null,
): InboundMediaRef | null {
  if (typeof fileId !== "string" || fileId.length === 0) return null;
  return { id: fileId, mimeType, kind, filename };
}

function documentKind(mimeType: string | undefined): InboundMediaRef["kind"] {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("audio/")) return "audio";
  return "document";
}

function firstContentKey(m: TelegramMessage): string {
  const record = m as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (METADATA_KEYS.has(key)) continue;
    const value = record[key];
    if (value !== undefined && value !== null) return key;
  }
  return "unknown";
}
