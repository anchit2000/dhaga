import { toAllDayDate } from "../follow-up-event";
import type { CalendarEvent, CalendarWriteEvent } from "../types";
import type { GoogleEventBody, GoogleEventDateTime, GoogleEventItem } from "./api-types";

/**
 * Pure Google-event ↔ CalendarEvent mapping: no fetch, so every normalisation
 * rule below is unit-testable on its own. Nothing here logs — titles, locations
 * and attendees are third-party PII (see ../types.ts).
 */

/**
 * An endpoint as an instant, or null when Google gave us nothing usable.
 * All-day endpoints arrive as a bare YYYY-MM-DD and are pinned to UTC midnight.
 * Google's all-day `end.date` is EXCLUSIVE (a one-day event ends on the next
 * day); it is kept exactly as given, which is also how we write it back.
 */
function toInstant(point: GoogleEventDateTime | undefined): Date | null {
  const raw = point?.dateTime ?? (point?.date ? `${point.date}T00:00:00Z` : null);
  if (!raw) return null;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** People only: the display name when Google has one, else the address. */
function toAttendeeNames(item: GoogleEventItem): string[] {
  return (item.attendees ?? [])
    .filter((attendee) => attendee.resource !== true)
    .map((attendee) => attendee.displayName ?? attendee.email)
    .filter((name): name is string => Boolean(name));
}

/**
 * One listed Google event → our CalendarEvent, or null when it is not a real
 * dated event: cancelled instances and rows missing an endpoint are dropped
 * rather than surfaced with a fabricated time.
 */
export function toCalendarEvent(item: GoogleEventItem): CalendarEvent | null {
  if (item.status === "cancelled") return null;
  const start = toInstant(item.start);
  const end = toInstant(item.end);
  if (!start || !end) return null;
  return {
    id: item.id,
    title: item.summary ?? null,
    start,
    end,
    allDay: Boolean(item.start?.date) && !item.start?.dateTime,
    location: item.location ?? null,
    attendees: toAttendeeNames(item),
  };
}

/** A follow-up we own → the events body Google wants. */
export function toGoogleEventBody(event: CalendarWriteEvent): GoogleEventBody {
  const endpoint = (at: Date): GoogleEventDateTime =>
    event.allDay ? { date: toAllDayDate(at) } : { dateTime: at.toISOString() };
  const body: GoogleEventBody = {
    summary: event.title,
    start: endpoint(event.start),
    end: endpoint(event.end),
  };
  if (event.description !== undefined) body.description = event.description;
  return body;
}
