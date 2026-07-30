/**
 * Inbound-messaging capture configuration + the pure text decisions the webhook
 * routes on (is this DONE? a link token? an answer to a pending question?).
 * Deterministic and side-effect free so the webhook logic and its unit tests
 * share one source of truth (`as const` + derived-union convention, per
 * @/utils/constants/app.ts). Reply STRINGS live in ./replies.
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

/**
 * Why a forwarded message was refused at the door instead of being batched.
 * Each reason has exactly one reply (./replies) — nothing is ever dropped
 * silently, which is the whole point of naming them.
 */
export const MESSAGING_REJECTIONS = ["empty", "voice_unsupported", "unsupported_attachment"] as const;
export type MessagingRejection = (typeof MESSAGING_REJECTIONS)[number];

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

/**
 * How long a "which person did you mean?" question stays answerable. Short on
 * purpose: a stale "1" typed an hour later must not attach a note to whoever
 * happened to be option 1 in a forgotten question.
 */
export const MESSAGING_QUESTION_TTL_MINUTES = 60;

/** One candidate person offered by a pending question, in the order shown in chat. */
export interface MessagingQuestionOption {
  contactId: string;
  label: string;
  sublabel: string | null;
}

/** What the sender's reply resolved to: a listed person, or "make a new one". */
export type MessagingQuestionAnswer =
  | { kind: "option"; contactId: string; label: string }
  | { kind: "new" };

/** Replies that mean "none of these — save it under a new person". */
const NEW_PERSON_ANSWERS = new Set(["new", "none", "neither", "0"]);

/**
 * Interpret a reply to a pending disambiguation question. Accepts the shown
 * number, a name (exact, or an unambiguous partial), or an explicit "new".
 * Returns null when the reply is not an answer at all — the caller then treats
 * the message as ordinary content instead of guessing a person (attaching a note
 * to the wrong contact is the failure this whole flow exists to prevent).
 */
export function parseQuestionAnswer(
  options: readonly MessagingQuestionOption[],
  text: string,
): MessagingQuestionAnswer | null {
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) return null;
  if (NEW_PERSON_ANSWERS.has(normalized)) return { kind: "new" };

  const asNumber = Number.parseInt(normalized, 10);
  if (String(asNumber) === normalized && asNumber >= 1 && asNumber <= options.length) {
    const chosen = options[asNumber - 1];
    return { kind: "option", contactId: chosen.contactId, label: chosen.label };
  }

  const exact = options.filter((option) => option.label.toLowerCase() === normalized);
  const matches = exact.length > 0
    ? exact
    : options.filter((option) => option.label.toLowerCase().includes(normalized));
  // Ambiguous partials ("ajay" when both are Ajays) are NOT an answer — asking
  // again beats picking one of two people at random.
  if (matches.length === 1) {
    return { kind: "option", contactId: matches[0].contactId, label: matches[0].label };
  }
  return null;
}
