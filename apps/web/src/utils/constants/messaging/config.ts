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

/** Cap on items processed in ONE RUN — bounds a single run's cost. Not a cap on
 *  the batch: the overflow stays unprocessed and the next sweep resumes it. */
export const MAX_SESSION_ITEMS = 50;

/**
 * The last-resort name for a contact a capture could not name at all. A saved
 * contact with an EMPTY name is the real failure this guards: it renders as a
 * blank row, cannot be found by search, and gives the user nothing to recognise
 * it by. A visible placeholder is at least something they can rename — and it
 * is the same string `recordAttribution` shows for a nameless contact, so the
 * batch summary and the contact row agree.
 */
export const UNNAMED_CONTACT_NAME = "Unnamed contact";

/**
 * WHY a note ended up on the person it ended up on. Every note the walk files
 * carries one, because filing is guesswork and the sender is the only one who
 * can catch a wrong guess:
 *
 * - `named`   — the note named someone and that name matched a person already
 *               in the graph;
 * - `new`     — the note named someone nobody matched, so they were created;
 * - `assumed` — the note named NOBODY, so it was filed on whoever the batch was
 *               already on. This is the weakest link in the whole flow and the
 *               one the summary must never leave unsaid.
 */
export const NOTE_ATTRIBUTION_BASES = ["named", "new", "assumed"] as const;
export type NoteAttributionBasis = (typeof NOTE_ATTRIBUTION_BASES)[number];

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
 * A `/start` command, with its payload if it carried one. Telegram sends this
 * when someone opens the bot — bare on a normal open, and with the token as a
 * payload when they arrive via a QR/deep link (see ./links). Also matches the
 * `/start@botname` form Telegram uses in groups.
 *
 * Returned as a shape rather than a bare string so callers can tell the two
 * cases apart: a bare `/start` is somebody saying hello and must never be
 * stored as a note, while `/start <token>` is a link attempt.
 */
export function parseStartCommand(text: string): { payload: string | null } | null {
  const match = /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?\s*$/.exec(text.trim());
  if (!match) return null;
  return { payload: match[1] ?? null };
}

/**
 * The link token a message carries — typed bare, or delivered as a `/start`
 * payload by a scanned deep link. Null when the message isn't a link attempt,
 * so the caller can treat it as ordinary content.
 */
export function extractLinkToken(text: string): string | null {
  const start = parseStartCommand(text);
  const candidate = start ? (start.payload ?? "") : text;
  return looksLikeLinkToken(candidate) ? candidate.trim().toUpperCase() : null;
}

/**
 * Idle auto-flush window — a batch with no DONE is saved after this many
 * minutes of no activity. Env-overridable for self-hosters; floored at 1 so a
 * bad value can never disable the flush entirely.
 *
 * The default is 24h because that is what the deployment can actually deliver:
 * the only guaranteed scheduler is the once-a-day cron (api/jobs/daily), so a
 * shorter promise ("saved after 15 min of quiet") is one the bot cannot keep —
 * and telling a sender their capture is saved when it isn't is the worst
 * failure this flow has. An instance that drives api/jobs/messaging/flush more
 * often can set DHAGA_MESSAGING_IDLE_MINUTES lower to match its real cadence.
 */
function readIdleMinutes(): number {
  const parsed = Number.parseInt(process.env.DHAGA_MESSAGING_IDLE_MINUTES ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 24 * 60;
}
export const MESSAGING_SESSION_IDLE_MINUTES = readIdleMinutes();

/** The idle window as chat copy — "24 hours", never "1440 min". */
export function idleWindowLabel(): string {
  const minutes = MESSAGING_SESSION_IDLE_MINUTES;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return days === 1 ? "24 hours" : `${days} days`;
}

/**
 * How long a batch may sit in `processing` before the daily sweep treats it as
 * STALLED and re-drives it. A flush runs in a background `after()` on a function
 * with a hard ceiling, so a big batch can be killed mid-walk; without this the
 * batch is stranded forever (the sweeper only ever looked for `open`). Generous
 * enough that a genuinely-running batch is never stolen from itself.
 */
export const MESSAGING_PROCESSING_STALL_MINUTES = 60;

/**
 * How many items an OPEN batch may hold before the bot stops accepting more and
 * asks for a DONE. Backpressure, not a limit for its own sake: at a 24h idle
 * window an unclosed batch could otherwise swallow a whole day of forwards, and
 * the longer it runs the more notes get filed by assumption onto whoever the
 * batch happened to be on. Refusing loudly at a small number keeps every batch
 * short enough for the sender to still remember who each note was about.
 * Env-overridable (DHAGA_MESSAGING_MAX_OPEN_ITEMS); floored at 1.
 */
function readMaxOpenItems(): number {
  const parsed = Number.parseInt(process.env.DHAGA_MESSAGING_MAX_OPEN_ITEMS ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 10;
}
export const MESSAGING_MAX_OPEN_ITEMS = readMaxOpenItems();
