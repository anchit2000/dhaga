/**
 * The capture log (Settings → Messaging → Capture log): the sizing and the
 * user-facing vocabulary that the LOG needs on top of what the capture flow
 * already names.
 *
 * The per-message verdicts and the batch failure reasons already have labels in
 * ./messaging/outcomes and are used verbatim — nothing here restates them. What
 * is added is only what the audit view alone has to say out loud: what a
 * batch's lifecycle status is called on screen, what a forwarded message's kind
 * is called, and how big a page is.
 *
 * `as const` + derived-union convention, per ./app.
 */
import type { MessagingItemKind, MessagingSessionStatus } from "@/utils/constants/messaging";

/**
 * Batches per page. Deliberately modest: every expanded row costs its own query
 * for that batch's messages, so a page sized for what someone actually reads is
 * cheaper than one sized for what they scroll past — and the keyset means page
 * 50 costs exactly what page 1 did, so there is nothing to win by asking for
 * more at a time.
 */
export const CAPTURE_LOG_PAGE_SIZE = 20;

/**
 * How many unfinished batches the Messaging settings panel names before it
 * stops enumerating and just points at the log. The affordance is a nudge, not
 * a second log.
 */
export const CAPTURE_LOG_UNFINISHED_LIMIT = 5;

/** Where the log lives. One definition, so the settings affordance and the
 *  page's own back link can never drift to different routes. */
export const CAPTURE_LOG_PATH = "/app/settings/messaging/log";

/** Where the settings affordance links back to (the Messaging tab's hash). */
export const MESSAGING_SETTINGS_PATH = "/app/settings#capture";

/**
 * A batch's lifecycle status in the sender's words. `open` is phrased as an
 * instruction rather than a state because it is the one status the user can
 * still act on from their phone.
 */
export const MESSAGING_SESSION_STATUS_LABELS: Record<MessagingSessionStatus, string> = {
  open: "Waiting for DONE",
  processing: "Processing",
  done: "Saved",
  failed: "Failed",
};

/** Narrow a stored status back to a label. Rows written by an older build (or
 *  a future one) can carry anything; an unrecognised value is named as unknown
 *  rather than crashing the log or being passed through raw. */
export function sessionStatusLabel(status: string): string {
  return MESSAGING_SESSION_STATUS_LABELS[status as MessagingSessionStatus] ?? "Unknown status";
}

/** What a forwarded message was, in the sender's words — "Photo", not "image". */
export const MESSAGING_ITEM_KIND_LABELS: Record<MessagingItemKind, string> = {
  text: "Note",
  contact_card: "Contact card",
  image: "Photo",
  audio: "Voice note",
  location: "Location",
  unsupported: "Unsupported",
};

/** Same defensive narrowing as sessionStatusLabel, for item kinds. */
export function itemKindLabel(kind: string): string {
  return MESSAGING_ITEM_KIND_LABELS[kind as MessagingItemKind] ?? "Message";
}

/**
 * The Messaging panel's unfinished-batch nudge. Phrased as "at least" once the
 * query's own cap is reached, because `listUnfinishedBatches` is a LIMITed read
 * — claiming an exact count off a capped result would state as fact a number we
 * deliberately did not go and get (Rule 12).
 */
export function unfinishedBatchesLabel(count: number, limit: number): string {
  const verb = count === 1 ? "batch hasn't" : "batches haven't";
  return `${count >= limit ? `${limit}+` : count} ${verb} finished`;
}
