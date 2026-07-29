/**
 * Microsoft Entra / Graph JSON payloads, narrowed to the fields this provider
 * actually reads. `strict: true` forbids `any`, so every response body gets a
 * local interface here rather than an untyped cast at the call site.
 *
 * Event subjects, locations and attendees are third-party PII: these shapes are
 * mapped straight into ../types (see ./events) and never logged, stringified
 * into an error, or sent anywhere but the caller.
 */

/** Token response from {tenant}/oauth2/v2.0/token — both grants share it. */
export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

/** The id_token claims we read to label the connection in the UI. */
export interface MicrosoftIdTokenPayload {
  email?: string;
  preferred_username?: string;
}

/** calendarView item under the free/busy projection ($select=start,end,showAs). */
export interface MicrosoftCalendarEvent {
  start: { dateTime: string };
  end: { dateTime: string };
  showAs: string;
}

export interface MicrosoftCalendarViewResponse {
  value?: MicrosoftCalendarEvent[];
}

/** calendarView item under the full-tier projection. All of this is PII. */
export interface MicrosoftEventItem {
  id: string;
  subject?: string | null;
  start: { dateTime: string };
  end: { dateTime: string };
  isAllDay?: boolean;
  location?: { displayName?: string | null } | null;
  attendees?: Array<{
    emailAddress?: { name?: string | null; address?: string | null } | null;
  }> | null;
}

export interface MicrosoftEventsResponse {
  value?: MicrosoftEventItem[];
}

/** me/calendars item ($select=id,name). Graph calendars have no description. */
export interface MicrosoftCalendarItem {
  id: string;
  name?: string | null;
}

export interface MicrosoftCalendarsResponse {
  value?: MicrosoftCalendarItem[];
}

/** Graph echoes the whole created/updated resource; we only need its id. */
export interface MicrosoftIdResponse {
  id: string;
}

/** Graph dateTimeTimeZone — the shape event writes use for start/end. */
export interface MicrosoftDateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

/** Request body for creating or patching an event on the Dhaga calendar. */
export interface MicrosoftEventBody {
  subject: string;
  isAllDay: boolean;
  start: MicrosoftDateTimeTimeZone;
  end: MicrosoftDateTimeTimeZone;
  body?: { contentType: "text"; content: string };
}
