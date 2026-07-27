/**
 * Inbound-messaging capture constants — forward a WhatsApp/Telegram contact
 * card, note, or voice note to the bot; a batch (a "session") accumulates
 * items until the user replies DONE or the session goes idle, then it is
 * processed into contacts. Every value here is pure/deterministic so the
 * webhook logic and its unit tests share one source of truth (`as const` +
 * derived-union convention, per @/utils/constants/app.ts).
 */

/** Built-in channels. Third-party channels register at runtime (open provider id in core). */
export const MESSAGING_PROVIDERS = ["whatsapp", "telegram"] as const;
export type BuiltinMessagingProvider = (typeof MESSAGING_PROVIDERS)[number];

/** Human-readable channel names for Settings (brand-cased — not a naive capitalize). */
export const MESSAGING_PROVIDER_LABELS: Record<BuiltinMessagingProvider, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

/** Persisted item kinds — the normalised shape a forwarded message is stored as. */
export const MESSAGING_ITEM_KINDS = ["text", "contact_card", "image", "audio", "location", "unsupported"] as const;
export type MessagingItemKind = (typeof MESSAGING_ITEM_KINDS)[number];

/** Session lifecycle: open → processing → done|failed. */
export const MESSAGING_SESSION_STATUSES = ["open", "processing", "done", "failed"] as const;
export type MessagingSessionStatus = (typeof MESSAGING_SESSION_STATUSES)[number];

/** Words that close a batch and trigger processing (matched trimmed + lowercased). */
export const DONE_DELIMITERS = ["done", "/done", "finish", "finished", "end"] as const;

export function isDoneDelimiter(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (DONE_DELIMITERS as readonly string[]).includes(normalized);
}

/** Hard cap on items in one batch — bounds a single processing run's cost. */
export const MAX_SESSION_ITEMS = 50;

/** Account-linking token: short-lived, single-use, sent from Settings and echoed to the bot. */
export const LINK_TOKEN_TTL_MINUTES = 30;
/** Unambiguous alphabet — no 0/O/1/l/I so a token is easy to retype from a phone. */
export const LINK_TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LINK_TOKEN_LENGTH = 8;

const LINK_TOKEN_CHARS = new Set(LINK_TOKEN_ALPHABET.split(""));

/** True when `text` is a single token of exactly LINK_TOKEN_LENGTH chars, all in the alphabet (case-insensitive). */
export function looksLikeLinkToken(text: string): boolean {
  const token = text.trim().toUpperCase();
  if (token.length !== LINK_TOKEN_LENGTH) return false;
  for (const char of token) {
    if (!LINK_TOKEN_CHARS.has(char)) return false;
  }
  return true;
}

/**
 * Idle auto-flush window — a batch with no DONE is saved after this many
 * minutes of no activity. Env-overridable for self-hosters; floored at 1 so a
 * bad value can never disable the flush entirely.
 */
function readIdleMinutes(): number {
  const parsed = Number.parseInt(process.env.DHAGA_MESSAGING_IDLE_MINUTES ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 15;
}
export const MESSAGING_SESSION_IDLE_MINUTES = readIdleMinutes();

/** Pure reply-string builders — no side effects, unit-testable in isolation. */

export function notRecognizedReply(): string {
  return "👋 I don't recognize this chat yet. Open Dhaga → Settings → Messaging, generate a link token, and send it here to connect your account.";
}

export function linkedReply(): string {
  return "✅ Connected! Forward contact cards, notes, or voice notes here and I'll turn them into people in your graph. Reply DONE when you're finished.";
}

export function invalidTokenReply(): string {
  return "⚠️ That link token isn't valid or has expired. Generate a fresh one in Dhaga → Settings → Messaging and send it here.";
}

export function ackFirstItemReply(): string {
  return "👍 Got it — keep forwarding contacts/notes, then reply DONE to save. (I'll auto-save after " + MESSAGING_SESSION_IDLE_MINUTES + " min of quiet.)";
}

export function processingReply(itemCount: number): string {
  const noun = itemCount === 1 ? "item" : "items";
  return `⏳ Processing ${itemCount} ${noun}… I'll send a summary in a moment.`;
}

export function emptySessionReply(): string {
  return "Nothing to save yet — forward a contact card, note, or voice note first, then reply DONE.";
}

export function summaryReply(input: {
  contactName: string | null;
  contactCount: number;
  noteCount: number;
  factCount: number;
}): string {
  const who = input.contactName
    ? input.contactName
    : `${input.contactCount} ${input.contactCount === 1 ? "contact" : "contacts"}`;
  const parts = [
    `${input.noteCount} ${input.noteCount === 1 ? "note" : "notes"}`,
    `${input.factCount} ${input.factCount === 1 ? "fact" : "facts"}`,
  ];
  return `✅ Saved ${who} — ${parts.join(", ")}. Open Dhaga to review.`;
}

/** Batch had items but none resolved to a contact — nudge toward a usable forward. */
export function noContactFoundReply(): string {
  return "🤔 I couldn't find a contact in that batch — try forwarding a contact card or a message with a name.";
}

/** Processing threw. Nothing is lost (items stay), so invite a retry. */
export function processingFailedReply(): string {
  return "⚠️ Something went wrong saving that batch — nothing was lost. Reply DONE to try again.";
}

/** Note body stored when a voice note arrives but no transcription provider is configured. */
export function voiceUnconfiguredNoteBody(): string {
  return "🎤 Voice note received — transcription is not configured (add a transcription provider to enable).";
}

/** Note body for a forwarded location pin. */
export function locationNoteBody(label: string): string {
  return "📍 Location: " + label;
}

/** Appended to a summary when the batch was capped at MAX_SESSION_ITEMS. */
export function truncatedNotice(max: number): string {
  return ` (Only the first ${max} items were processed.)`;
}

/** Appended to a summary when a voice note was dropped for lack of transcription. */
export function voiceSkippedNotice(): string {
  return " (A voice note was skipped — transcription isn't configured.)";
}
