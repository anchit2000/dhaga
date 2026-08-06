import type { CalendarWriteEvent } from "./types";

/**
 * Follow-up → calendar-event mapping, pure and provider-agnostic.
 *
 * Dhaga only ever writes into a SECONDARY calendar it creates itself, named
 * below — never the user's primary calendar — so the whole write-out stays one
 * toggle (or one calendar deletion) away from being undone.
 */

/** The name of the secondary calendar Dhaga creates and owns. */
export const DHAGA_CALENDAR_NAME = "Dhaga";

/** Shown on the created calendar in Google/Outlook so its provenance is obvious. */
export const DHAGA_CALENDAR_DESCRIPTION =
  "Follow-ups written by Dhaga. Delete or hide this calendar at any time — Dhaga never writes anywhere else.";

const DAY_MS = 86_400_000;

/** The follow-up fields the mapping needs — a structural subset of the DB row. */
export interface FollowUpForCalendar {
  contactName: string | null;
  action: string;
  dueDate: Date | null;
  status: string;
}

/**
 * The event a follow-up should occupy on the Dhaga calendar, or `null` when it
 * should occupy none. `null` is the load-bearing case: a follow-up that is done,
 * dismissed, or no longer dated must not linger as an event, so callers delete
 * whatever they previously wrote whenever this returns null.
 */
export function followUpToCalendarEvent(
  followUp: FollowUpForCalendar,
): CalendarWriteEvent | null {
  if (followUp.status !== "open" || !followUp.dueDate) return null;
  const action = followUp.action.trim();
  if (!action) return null;
  const start = followUp.dueDate;
  return {
    title: followUp.contactName ? `Follow up: ${followUp.contactName}` : action,
    start,
    // All-day, one day long. Providers render the exclusive end date the same
    // way the in-app calendar pins a due date: from the UTC date part.
    end: new Date(start.getTime() + DAY_MS),
    allDay: true,
    description: action,
  };
}

/** UTC date part (YYYY-MM-DD) — the all-day representation both providers want. */
export function toAllDayDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
