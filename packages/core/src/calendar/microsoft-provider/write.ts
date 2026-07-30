import { DHAGA_CALENDAR_NAME } from "../follow-up-event";
import { toGraphEventBody } from "./events";
import { GONE_STATUSES, graphGet, graphSend, readId } from "./http";
import type { CalendarWriteEvent } from "../types";
import type { MicrosoftCalendarsResponse } from "./graph-types";

/**
 * Full-tier writes. Dhaga only ever touches the secondary calendar it creates
 * itself, so the whole write-out stays one calendar deletion away from undone.
 * Errors carry the HTTP status only — never a title or a response body.
 */

/**
 * Find-or-create the Dhaga calendar, re-validating a stored id first so a
 * calendar the user deleted is quietly replaced rather than failing every write.
 */
export async function ensureWriteCalendar({
  accessToken,
  calendarId,
}: {
  accessToken: string;
  calendarId: string | null;
}): Promise<string> {
  if (calendarId) {
    const existing = await graphGet(`/me/calendars/${encodeURIComponent(calendarId)}`, accessToken);
    if (existing.ok) {
      return calendarId;
    }
    if (!GONE_STATUSES.includes(existing.status)) {
      throw new Error(`Microsoft calendar lookup failed (HTTP ${existing.status})`);
    }
  }
  const list = await graphGet("/me/calendars?$select=id,name&$top=100", accessToken);
  if (!list.ok) {
    throw new Error(`Microsoft calendar list failed (HTTP ${list.status})`);
  }
  const body = (await list.json()) as MicrosoftCalendarsResponse;
  const found = (body.value ?? []).find((calendar) => calendar.name === DHAGA_CALENDAR_NAME);
  if (found) {
    return found.id;
  }
  // Graph calendars carry no description field, so the name alone identifies ours.
  const created = await graphSend("POST", "/me/calendars", accessToken, {
    name: DHAGA_CALENDAR_NAME,
  });
  if (!created.ok) {
    throw new Error(`Microsoft calendar create failed (HTTP ${created.status})`);
  }
  return readId(created);
}

/** Create or update the event backing a follow-up; returns the live event id. */
export async function upsertEvent({
  accessToken,
  calendarId,
  externalEventId,
  event,
}: {
  accessToken: string;
  calendarId: string;
  externalEventId: string | null;
  event: CalendarWriteEvent;
}): Promise<string> {
  const payload = toGraphEventBody(event);
  if (externalEventId) {
    const path = `/me/events/${encodeURIComponent(externalEventId)}`;
    const patched = await graphSend("PATCH", path, accessToken, payload);
    if (patched.ok) {
      return readId(patched);
    }
    // Deleted from Outlook behind our back — fall through and write a fresh one.
    if (!GONE_STATUSES.includes(patched.status)) {
      throw new Error(`Microsoft event update failed (HTTP ${patched.status})`);
    }
  }
  const path = `/me/calendars/${encodeURIComponent(calendarId)}/events`;
  const created = await graphSend("POST", path, accessToken, payload);
  if (!created.ok) {
    throw new Error(`Microsoft event create failed (HTTP ${created.status})`);
  }
  return readId(created);
}

/**
 * Remove an event we wrote. Load-bearing: a completed or dismissed follow-up
 * must not linger, and one the user already deleted is success, not an error.
 */
export async function deleteEvent({
  accessToken,
  externalEventId,
}: {
  accessToken: string;
  externalEventId: string;
}): Promise<void> {
  const path = `/me/events/${encodeURIComponent(externalEventId)}`;
  const response = await graphSend("DELETE", path, accessToken);
  if (!response.ok && !GONE_STATUSES.includes(response.status)) {
    throw new Error(`Microsoft event delete failed (HTTP ${response.status})`);
  }
}
