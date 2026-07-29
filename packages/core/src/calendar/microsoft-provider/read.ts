import { asUtc, toCalendarEvent } from "./events";
import { graphGet } from "./http";
import type { BusyInterval, CalendarEvent, TimeRange } from "../types";
import type { MicrosoftCalendarViewResponse, MicrosoftEventsResponse } from "./graph-types";

/**
 * The two calendarView reads, one per tier. They differ only in $select: the
 * free/busy projection cannot return a title even by accident, which is the
 * point — a connection that never opted in has no code path to event detail.
 */

function calendarViewPath(range: TimeRange, select: string): string {
  const window = `startDateTime=${range.from.toISOString()}&endDateTime=${range.to.toISOString()}`;
  return `/me/calendarView?${window}&$select=${select}&$top=100`;
}

/** Busy blocks only — the free/busy tier's whole contract. */
export async function listBusy({
  accessToken,
  range,
}: {
  accessToken: string;
  range: TimeRange;
}): Promise<BusyInterval[]> {
  const response = await graphGet(calendarViewPath(range, "start,end,showAs"), accessToken);
  if (!response.ok) {
    throw new Error(`Microsoft calendar read failed (HTTP ${response.status})`);
  }
  const body = (await response.json()) as MicrosoftCalendarViewResponse;
  // Keep everything except free; Graph returns UTC dateTimes without a trailing Z.
  return (body.value ?? [])
    .filter((event) => event.showAs !== "free")
    .map((event) => ({ start: asUtc(event.start.dateTime), end: asUtc(event.end.dateTime) }));
}

/** Full tier only: real events, titles and attendees included. */
export async function listEvents({
  accessToken,
  range,
}: {
  accessToken: string;
  range: TimeRange;
}): Promise<CalendarEvent[]> {
  const select = "id,subject,start,end,isAllDay,location,attendees";
  const response = await graphGet(calendarViewPath(range, select), accessToken);
  if (!response.ok) {
    throw new Error(`Microsoft event read failed (HTTP ${response.status})`);
  }
  const body = (await response.json()) as MicrosoftEventsResponse;
  return (body.value ?? []).map(toCalendarEvent);
}
