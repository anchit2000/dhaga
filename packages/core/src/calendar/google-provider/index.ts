import { capabilitiesFromScopeTokens } from "../capability";
import type {
  BusyInterval,
  CalendarCapabilities,
  CalendarEvent,
  CalendarProvider,
  CalendarTokens,
  CalendarWriteEvent,
  TimeRange,
} from "../types";
import { fetchBusy, fetchEvents } from "./api";
import { exchangeCodeForTokens, refreshTokens } from "./auth";
import { deleteDhagaEvent, ensureDhagaCalendar, upsertDhagaEvent } from "./write";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * The default ask, and the only thing every already-connected account ever
 * granted: free/busy, never event titles/attendees/bodies. Widening this string
 * would leave every existing connection's stored scope short of what we now ask
 * for — i.e. flip them all to needs_reconnect — so it stays exactly as it was.
 */
const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar.freebusy";

/**
 * The opt-in upgrade, requested only via getAuthUrl({ upgrade: true }).
 * calendar.app.created rather than the broad calendar scope: it confines Dhaga
 * to calendars it created itself, so the write tier cannot reach anything the
 * user already had — and it is a far narrower ask at Google's app review.
 */
const GOOGLE_UPGRADE_SCOPES =
  "openid email https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.app.created";

/** Either of these grants real events; neither is in the free/busy default. */
const GOOGLE_READ_SCOPE_TOKENS = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];
/** App-created calendars only — all Dhaga ever writes to (./write). */
const GOOGLE_WRITE_SCOPE_TOKENS = ["https://www.googleapis.com/auth/calendar.app.created"];

/**
 * Google Calendar provider (see ../types.ts). Free/busy by default; the full
 * tier — real events plus follow-ups written into a dedicated "Dhaga" calendar
 * — is opt-in per connection and reachable only through a second consent screen
 * (`upgrade: true`), with the tier derived from the granted scope, never assumed.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  id = "google";
  label = "Google Calendar";

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  getAuthUrl({ state, redirectUri, upgrade }: { state: string; redirectUri: string; upgrade?: boolean }): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: upgrade === true ? GOOGLE_UPGRADE_SCOPES : GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  exchangeCode({ code, redirectUri }: { code: string; redirectUri: string }): Promise<CalendarTokens> {
    return exchangeCodeForTokens(code, redirectUri);
  }

  refresh(refreshToken: string): Promise<CalendarTokens | null> {
    return refreshTokens(refreshToken);
  }

  listBusy({ accessToken, range }: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]> {
    return fetchBusy(accessToken, range);
  }

  capabilitiesFromScope(scope: string | null): CalendarCapabilities {
    return capabilitiesFromScopeTokens(scope, GOOGLE_READ_SCOPE_TOKENS, GOOGLE_WRITE_SCOPE_TOKENS);
  }

  listEvents({ accessToken, range }: { accessToken: string; range: TimeRange }): Promise<CalendarEvent[]> {
    return fetchEvents(accessToken, range);
  }

  ensureWriteCalendar({
    accessToken,
    calendarId,
  }: {
    accessToken: string;
    calendarId: string | null;
  }): Promise<string> {
    return ensureDhagaCalendar(accessToken, calendarId);
  }

  upsertEvent({
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
    return upsertDhagaEvent(accessToken, calendarId, externalEventId, event);
  }

  deleteEvent({
    accessToken,
    calendarId,
    externalEventId,
  }: {
    accessToken: string;
    calendarId: string;
    externalEventId: string;
  }): Promise<void> {
    return deleteDhagaEvent(accessToken, calendarId, externalEventId);
  }
}
