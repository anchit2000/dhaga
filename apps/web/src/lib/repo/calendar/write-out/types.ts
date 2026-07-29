import type { CalendarTokens, CalendarWriteEvent } from "@dhaga/core";

/** One connection the follow-up should be mirrored to, with everything the
 *  network phase needs — so that phase touches no database at all. */
export interface WriteTarget {
  connectionId: string;
  providerId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  /** The Dhaga calendar we already created on this connection, if any. */
  writeCalendarId: string | null;
  /** The link row for this follow-up on this connection, if we wrote it before. */
  linkId: string | null;
  externalEventId: string | null;
}

/** What the follow-up should look like on the connected calendars, and where.
 *  `event: null` means "it must not be there" — done, dismissed, or undated. */
export interface WritePlan {
  followUpId: string;
  event: CalendarWriteEvent | null;
  targets: WriteTarget[];
}

/** The result of one target's network work, ready to be written back. */
export interface WriteOutcome {
  connectionId: string;
  linkId: string | null;
  /** The event id now on the calendar; null once the event is gone. */
  externalEventId: string | null;
  writeCalendarId: string | null;
  /** Tokens the provider handed back mid-flight, to persist in the same pass. */
  refreshed: CalendarTokens | null;
  /** True when this connection should be flagged `needs_reconnect`. */
  failed: boolean;
}
