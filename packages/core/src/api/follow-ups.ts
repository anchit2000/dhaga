import type { RecurrenceRule } from "../dates/recurrence";

/**
 * Wire contract for `GET /api/follow-ups`. Types only (no runtime code): clients
 * deep-import this module so the Anthropic SDK re-exported by the package
 * barrel never enters their bundles (mirrors ./sync, ./capture and ./import).
 *
 * Why this endpoint exists at all: the web app renders its calendar from a
 * server component, so until now nothing PUBLISHED follow-ups over HTTP. The
 * mobile device-calendar feature needs them, and the only route that already
 * carried them — `GET /api/export/json` — embeds `card_images.data_base64`,
 * i.e. every scanned business card, which would be tens of megabytes on every
 * calendar refresh.
 */

/** DB-backed lifecycle of a follow-up (`follow_ups.status`). */
export type FollowUpStatus = "open" | "done" | "dismissed";

/** One follow-up as the server publishes it. */
export interface FollowUpSummary {
  id: string;
  /** Null for a company task or an unlinked general TODO. */
  contactId: string | null;
  /** Third-party PII: never log this, and never send it to an LLM. */
  contactName: string | null;
  /** Optional for backwards compatibility with clients predating company tasks. */
  companyId?: string | null;
  companyName?: string | null;
  action: string;
  /** ISO timestamp, or null for an undated follow-up (web's Unscheduled tray). */
  dueDate: string | null;
  dueHint: string | null;
  status: FollowUpStatus;
  /** Omitted by older servers; null means one-off. */
  recurrence?: RecurrenceRule | null;
}

/**
 * Success body of `GET /api/follow-ups`.
 *
 * Deliberately carries OPEN follow-ups only, so the payload stays bounded — a
 * long-lived graph accumulates done follow-ups without limit, and a calendar
 * refresh must not grow with a user's history.
 *
 * The consequence for clients: a follow-up that was completed, dismissed or
 * deleted is signalled by its ABSENCE, not by a status change. A client that
 * mirrors these into a device calendar must therefore reconcile against the
 * whole set (remove any event whose follow-up is no longer listed) rather than
 * waiting to observe a `done` status it will never receive. `status` still
 * travels because the field is part of the record's identity and a future
 * endpoint may widen the filter; today it is always "open".
 */
export interface FollowUpsResponse {
  followUps: FollowUpSummary[];
}
