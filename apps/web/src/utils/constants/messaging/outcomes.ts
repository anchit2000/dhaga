/**
 * What became of ONE forwarded message, and of one batch. This is the vocabulary
 * of the capture log (settings → messaging) and of the closing chat summary —
 * both read from the same persisted verdicts, so what the bot said and what the
 * app shows can never drift apart.
 *
 * Deterministic and side-effect free (`as const` + derived-union convention, per
 * @/utils/constants/app.ts). Reply STRINGS live in ./replies.
 */

/**
 * The per-message verdict stored on messaging_session_items.outcome_kind.
 *
 * - `created`     — this message helped create a new contact.
 * - `attached`    — it was filed on somebody already in the graph.
 * - `unclear`     — it named someone we could not pin down; parked in the
 *                   confirmation inbox and stored on NOBODY until answered.
 * - `directive`   — it told us what to do with other messages ("create a new
 *                   contact") and carried nothing to store on its own. Folded
 *                   into the person it concerned rather than filed as a note.
 * - `unreadable`  — we could not get text out of it (a photo that would not
 *                   download, a transcription that came back empty).
 * - `unaccounted` — the planner returned a plan that never mentioned this
 *                   message. It is a BUG when this appears, which is exactly
 *                   why it is a storable verdict rather than a silent gap: the
 *                   sender is told, and the capture log shows which message
 *                   fell through (CLAUDE.md Rule 12).
 */
export const MESSAGING_ITEM_OUTCOMES = [
  "created",
  "attached",
  "unclear",
  "directive",
  "unreadable",
  "unaccounted",
] as const;
export type MessagingItemOutcome = (typeof MESSAGING_ITEM_OUTCOMES)[number];

/** Human labels for the capture log. Kept beside the union so a new verdict
 *  cannot be added without someone deciding what the user should see. */
export const MESSAGING_ITEM_OUTCOME_LABELS: Record<MessagingItemOutcome, string> = {
  created: "New contact",
  attached: "Added to existing",
  unclear: "Needs your input",
  directive: "Instruction",
  unreadable: "Couldn't read",
  unaccounted: "Not accounted for",
};

/**
 * Why a batch ended the way it did, stored on messaging_sessions.error. PII-free
 * by construction — these are fixed strings, never the forwarded content, so a
 * row is safe to render in the capture log and safe to appear in a log line.
 */
export const MESSAGING_BATCH_FAILURES = [
  "no_llm",
  "over_budget",
  "plan_failed",
  "apply_failed",
] as const;
export type MessagingBatchFailure = (typeof MESSAGING_BATCH_FAILURES)[number];

/** What the capture log shows for a failed batch, and what the user can do. */
export const MESSAGING_BATCH_FAILURE_LABELS: Record<MessagingBatchFailure, string> = {
  no_llm: "No AI configured — nothing was read",
  over_budget: "Out of AI credits this month",
  plan_failed: "The AI couldn't read this batch",
  apply_failed: "Saving failed part-way",
};

/** Narrow an arbitrary stored string back to a known failure, for rendering.
 *  Older rows and future builds can carry anything; an unrecognised value is
 *  shown as a generic failure rather than crashing the log. */
export function batchFailureLabel(error: string | null): string | null {
  if (!error) return null;
  return (
    MESSAGING_BATCH_FAILURE_LABELS[error as MessagingBatchFailure] ??
    "Something went wrong saving this batch"
  );
}
