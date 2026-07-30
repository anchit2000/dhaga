/**
 * Persisted, dismissible notifications. Today's only writer is the background
 * extraction worker: a job that finishes, fails, or is blocked by the AI budget
 * used to be completely invisible once the user navigated away (no email, no
 * toast, no record). A row here is that record.
 */

/**
 * Notification kinds. Deliberately a widening union — a new surface (import
 * finished, digest ready) adds a member here and a copy builder, with no schema
 * change (the column is plain text, `$type`-narrowed in db/schema).
 *
 * `job_blocked` is separate from `job_failed` on purpose: "blocked" is terminal
 * but NOT a failure (see EXTRACTION_JOB_STATUSES), so folding it into
 * `job_failed` would render a red error for a calm paid-feature notice.
 */
export const NOTIFICATION_TYPES = ["job_done", "job_failed", "job_blocked"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** unread → read (opened) → dismissed (removed from the feed, row kept). */
export const NOTIFICATION_STATUSES = ["unread", "read", "dismissed"] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** How many notifications the bell/feed reads at once. */
export const NOTIFICATION_FEED_LIMIT = 20;

/**
 * Anti-flood window for the optional job email: at most one per user per this
 * many minutes. Jobs arrive in bursts — five notes pasted in a row, or one bad
 * API key failing every one of them — and one email per job would be spam, so
 * the burst collapses to a single email. The in-app notification is unaffected:
 * every job writes one, always (see repo/notifications/job-email).
 */
export const JOB_EMAIL_COOLDOWN_MINUTES = 15;
