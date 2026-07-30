import type { BusyInterval, CalendarEvent, TimeRange } from "../types";
import type { GoogleEventsResponse, GoogleFreeBusyResponse } from "./api-types";
import { toCalendarEvent } from "./events";

/**
 * Google Calendar v3 reads, plus the shared request/failure helpers ./write
 * uses. Errors carry the HTTP status and nothing else: a response body here
 * holds event titles, locations and attendees — third-party PII that must never
 * reach a log line or an Error message.
 */

export const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const FREEBUSY_URL = `${CALENDAR_API}/freeBusy`;
/** Exactly the fields ./events normalises — Google trims the payload to these. */
const EVENT_FIELDS = "items(id,status,summary,location,start,end,attendees(email,displayName,resource))";
/** 404 = gone, 410 = gone and already reaped. Both mean "not there any more". */
const GONE_STATUSES = new Set([404, 410]);

export function isGone(status: number): boolean {
  return GONE_STATUSES.has(status);
}

/** Status only — never a response body, see the file header. */
export function failCalendar(action: string, status: number): never {
  throw new Error(`Google ${action} failed (HTTP ${status})`);
}

export function calendarFetch(
  url: string,
  accessToken: string,
  init: { method?: string; body?: string } = {},
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
}

/** The free/busy tier: busy blocks on the primary calendar, no event detail. */
export async function fetchBusy(accessToken: string, range: TimeRange): Promise<BusyInterval[]> {
  const response = await calendarFetch(FREEBUSY_URL, accessToken, {
    method: "POST",
    body: JSON.stringify({
      timeMin: range.from.toISOString(),
      timeMax: range.to.toISOString(),
      items: [{ id: "primary" }],
    }),
  });
  if (!response.ok) {
    failCalendar("free/busy read", response.status);
  }
  const body = (await response.json()) as GoogleFreeBusyResponse;
  const busy = body.calendars?.primary?.busy ?? [];
  return busy.map((interval) => ({
    start: new Date(interval.start),
    end: new Date(interval.end),
  }));
}

/** Full tier only: real events on the primary calendar within `range`. */
export async function fetchEvents(accessToken: string, range: TimeRange): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: range.from.toISOString(),
    timeMax: range.to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    fields: EVENT_FIELDS,
  });
  const response = await calendarFetch(`${CALENDAR_API}/calendars/primary/events?${params.toString()}`, accessToken);
  if (!response.ok) {
    failCalendar("event read", response.status);
  }
  const body = (await response.json()) as GoogleEventsResponse;
  return (body.items ?? [])
    .map((item) => toCalendarEvent(item))
    .filter((event): event is CalendarEvent => event !== null);
}
