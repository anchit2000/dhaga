import { DHAGA_CALENDAR_DESCRIPTION, DHAGA_CALENDAR_NAME } from "../follow-up-event";
import type { CalendarWriteEvent } from "../types";
import { CALENDAR_API, calendarFetch, failCalendar, isGone } from "./api";
import type { GoogleCalendarListResponse, GoogleIdResponse } from "./api-types";
import { toGoogleEventBody } from "./events";

/**
 * Full tier only: every write Dhaga makes, all of them confined to the
 * secondary "Dhaga" calendar it creates itself (../follow-up-event) — never the
 * user's primary calendar, so deleting that one calendar undoes the lot. As in
 * ./api, errors carry the HTTP status only; these bodies hold follow-up text.
 */

/** The Dhaga calendar we already own, or null when it is not there any more. */
async function findDhagaCalendar(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({ minAccessRole: "owner", fields: "items(id,summary)" });
  const response = await calendarFetch(`${CALENDAR_API}/users/me/calendarList?${params.toString()}`, accessToken);
  if (!response.ok) {
    failCalendar("calendar list", response.status);
  }
  const body = (await response.json()) as GoogleCalendarListResponse;
  return (body.items ?? []).find((item) => item.summary === DHAGA_CALENDAR_NAME)?.id ?? null;
}

async function createDhagaCalendar(accessToken: string): Promise<string> {
  const response = await calendarFetch(`${CALENDAR_API}/calendars`, accessToken, {
    method: "POST",
    body: JSON.stringify({ summary: DHAGA_CALENDAR_NAME, description: DHAGA_CALENDAR_DESCRIPTION }),
  });
  if (!response.ok) {
    failCalendar("calendar create", response.status);
  }
  return ((await response.json()) as GoogleIdResponse).id;
}

/**
 * The id of the calendar to write into. A stored id is re-validated first: the
 * user may have deleted the calendar by hand, and recreating it beats failing
 * every write from then on. Any other error is real and propagates.
 */
export async function ensureDhagaCalendar(accessToken: string, calendarId: string | null): Promise<string> {
  if (calendarId) {
    const response = await calendarFetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}`, accessToken);
    if (response.ok) return calendarId;
    if (!isGone(response.status)) {
      failCalendar("calendar lookup", response.status);
    }
  }
  const found = await findDhagaCalendar(accessToken);
  return found ?? createDhagaCalendar(accessToken);
}

/** Create (externalEventId null) or update our event, returning its id. */
export async function upsertDhagaEvent(
  accessToken: string,
  calendarId: string,
  externalEventId: string | null,
  event: CalendarWriteEvent,
): Promise<string> {
  const events = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;
  const body = JSON.stringify(toGoogleEventBody(event));
  if (externalEventId) {
    const patched = await calendarFetch(`${events}/${encodeURIComponent(externalEventId)}`, accessToken, {
      method: "PATCH",
      body,
    });
    if (patched.ok) return ((await patched.json()) as GoogleIdResponse).id;
    // The user deleted our event by hand — recreate it instead of failing forever.
    if (!isGone(patched.status)) {
      failCalendar("event write", patched.status);
    }
  }
  const created = await calendarFetch(events, accessToken, { method: "POST", body });
  if (!created.ok) {
    failCalendar("event write", created.status);
  }
  return ((await created.json()) as GoogleIdResponse).id;
}

/**
 * Remove our event. Already gone is the goal state, not an error — this is
 * load-bearing: a completed or dismissed follow-up must not linger as an event.
 */
export async function deleteDhagaEvent(
  accessToken: string,
  calendarId: string,
  externalEventId: string,
): Promise<void> {
  const path = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`;
  const response = await calendarFetch(path, accessToken, { method: "DELETE" });
  if (!response.ok && !isGone(response.status)) {
    failCalendar("event delete", response.status);
  }
}
