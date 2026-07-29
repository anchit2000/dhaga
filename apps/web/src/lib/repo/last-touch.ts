import { sql } from "drizzle-orm";
import { contacts, eventContacts, notes } from "@/lib/db/schema";

/**
 * Every touch APART from the capture itself: an explicit "I reached out", a
 * note, an event scan. Defined once so the ordering and the reason below can
 * never disagree about which signals count — a badge that named fewer signals
 * than the ORDER BY would misexplain why a row is where it is.
 */
const touchesSinceCaptureSql = sql`GREATEST(
  COALESCE(${contacts.lastReachedOutAt}, ${contacts.createdAt}),
  COALESCE(MAX(${notes.createdAt}), ${contacts.createdAt}),
  COALESCE(MAX(${eventContacts.scannedAt}), ${contacts.createdAt})
)`;

/**
 * What "last touch" means, defined once (BRD §6.7: own-graph signals only —
 * capture, an explicit "I reached out", a note, an event scan; never external
 * activity). Relationship decay and Home's "Recent people" ordering must agree
 * on it, so both read this expression rather than re-deriving it.
 *
 * These are AGGREGATE expressions: any query using them must left-join `notes`
 * (soft-deleted rows excluded — a tombstoned note is not a touch) and
 * `event_contacts`, and GROUP BY the contact.
 */
export const lastTouchSql = sql<Date>`GREATEST(
  ${contacts.createdAt},
  ${touchesSinceCaptureSql}
)`;

/** Why a contact is surfacing as recent. */
export type RecentReason = "added" | "interacted";

/**
 * The touch KIND behind `lastTouchSql`: "interacted" once ANY of the same
 * signals is newer than the capture, otherwise "added" (nothing has happened
 * since they were captured). It reads the identical expression the ordering
 * does, so the tag is exhaustive: whatever lifted a contact up the list is
 * named. Same join/GROUP BY contract as `lastTouchSql`.
 */
export const recentReasonSql = sql<RecentReason>`CASE
  WHEN ${touchesSinceCaptureSql} > ${contacts.createdAt} THEN 'interacted'
  ELSE 'added'
END`;
