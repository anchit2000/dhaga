import { toAllDayDate } from "../follow-up-event";
import type { CalendarEvent, CalendarWriteEvent } from "../types";
import type {
  MicrosoftDateTimeTimeZone,
  MicrosoftEventBody,
  MicrosoftEventItem,
} from "./graph-types";

/**
 * Pure mapping between Graph JSON and the provider-agnostic calendar types
 * (../types). No I/O, no env, no logging — so it is unit testable without a
 * network call, and so third-party PII has exactly one place it can flow.
 */

/** Graph returns UTC dateTimes without a trailing Z; parse them as UTC anyway. */
export function asUtc(dateTime: string): Date {
  return new Date(dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`);
}

/** calendarView item → CalendarEvent. */
export function toCalendarEvent(item: MicrosoftEventItem): CalendarEvent {
  return {
    id: item.id,
    title: item.subject ?? null,
    start: asUtc(item.start.dateTime),
    end: asUtc(item.end.dateTime),
    allDay: item.isAllDay === true,
    // Graph sends "" for an unset location, which is not a location.
    location: item.location?.displayName || null,
    attendees: (item.attendees ?? [])
      .map((attendee) => attendee.emailAddress?.name ?? attendee.emailAddress?.address)
      .filter((name): name is string => Boolean(name)),
  };
}

/** CalendarWriteEvent → the Graph body, shared by create and update. */
export function toGraphEventBody(event: CalendarWriteEvent): MicrosoftEventBody {
  const payload: MicrosoftEventBody = {
    subject: event.title,
    isAllDay: event.allDay,
    start: toGraphDateTime(event.start, event.allDay),
    end: toGraphDateTime(event.end, event.allDay),
  };
  if (event.description) {
    payload.body = { contentType: "text", content: event.description };
  }
  return payload;
}

/**
 * Graph rejects an all-day event whose start/end is not midnight, so all-day
 * events are pinned to the UTC date part — the same day cell the app shows, and
 * an exclusive end date, which is what followUpToCalendarEvent already produces.
 */
function toGraphDateTime(date: Date, allDay: boolean): MicrosoftDateTimeTimeZone {
  return {
    dateTime: allDay ? `${toAllDayDate(date)}T00:00:00` : date.toISOString(),
    timeZone: "UTC",
  };
}
