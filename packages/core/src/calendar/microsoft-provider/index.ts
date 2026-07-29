import { buildAuthUrl, exchangeCode, refreshTokens } from "./oauth";
import { listBusy, listEvents } from "./read";
import { capabilitiesFromScope } from "./scopes";
import { deleteEvent, ensureWriteCalendar, upsertEvent } from "./write";
import type {
  BusyInterval,
  CalendarCapabilities,
  CalendarEvent,
  CalendarProvider,
  CalendarTokens,
  CalendarWriteEvent,
  TimeRange,
} from "../types";

/**
 * Microsoft (Graph) calendar provider — one CalendarProvider implementation
 * (see ../types), thin enough to be read in one screen: every method delegates
 * to ./oauth, ./read, ./write or ./scopes.
 *
 * Free/busy by default (busy blocks via calendarView + showAs), which is all any
 * connection made before the full tier existed can do. The full tier is opt-in
 * per connection — getAuthUrl({ upgrade: true }) — and adds reading real events
 * plus writing follow-ups into a secondary "Dhaga" calendar, never the user's
 * primary. Which tier a connection is on is derived from its stored scope
 * (./scopes), so no existing connection can be treated as upgraded.
 */
export class MicrosoftCalendarProvider implements CalendarProvider {
  id = "microsoft";
  label = "Microsoft Calendar";

  isConfigured(): boolean {
    return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  }

  getAuthUrl(params: { state: string; redirectUri: string; upgrade?: boolean }): string {
    return buildAuthUrl(params);
  }

  exchangeCode(params: { code: string; redirectUri: string }): Promise<CalendarTokens> {
    return exchangeCode(params);
  }

  refresh(refreshToken: string, scope?: string | null): Promise<CalendarTokens | null> {
    return refreshTokens(refreshToken, scope);
  }

  listBusy(params: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]> {
    return listBusy(params);
  }

  capabilitiesFromScope(scope: string | null): CalendarCapabilities {
    return capabilitiesFromScope(scope);
  }

  listEvents(params: { accessToken: string; range: TimeRange }): Promise<CalendarEvent[]> {
    return listEvents(params);
  }

  ensureWriteCalendar(params: { accessToken: string; calendarId: string | null }): Promise<string> {
    return ensureWriteCalendar(params);
  }

  upsertEvent(params: {
    accessToken: string;
    calendarId: string;
    externalEventId: string | null;
    event: CalendarWriteEvent;
  }): Promise<string> {
    return upsertEvent(params);
  }

  // calendarId is part of the contract but unused: Graph deletes by event id.
  deleteEvent({
    accessToken,
    externalEventId,
  }: {
    accessToken: string;
    calendarId: string;
    externalEventId: string;
  }): Promise<void> {
    return deleteEvent({ accessToken, externalEventId });
  }
}
