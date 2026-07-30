/**
 * Provider-agnostic calendar integration — the counterpart to SearchClient
 * (../search) and LLMClient (../llm). A contributor adds a new calendar
 * (Apple/CalDAV, Fastmail, an .ics feed, …) by implementing CalendarProvider
 * and calling registerCalendarProvider() (./index.ts); callers in apps/web
 * never see which provider ran (Open/Closed, Dependency Inversion).
 *
 * Access is TIERED, and the tier is derived from the scope the user actually
 * granted (see ./capability.ts) — never assumed:
 *   - free/busy (the default, and all any existing connection has): busy blocks
 *     only, never titles/attendees/bodies. `listBusy` is the whole contract.
 *   - full (strictly opt-in, per connection, via a second consent screen):
 *     `listEvents` reads real events, and follow-ups are written OUT to a
 *     dedicated secondary "Dhaga" calendar — never the user's primary one, so
 *     it stays toggleable and deletable. Nothing else is ever written.
 * Every method past `listBusy` is OPTIONAL (Interface Segregation): a free/busy
 * provider implements none of them and stays a valid CalendarProvider.
 */

/** A busy block on the connected calendar. No title/attendees — busy only. */
export interface BusyInterval {
  start: Date;
  end: Date;
}

/** A half-open time window [from, to) to query or search within. */
export interface TimeRange {
  from: Date;
  to: Date;
}

/** What a connection is allowed to do, derived from its granted OAuth scope. */
export interface CalendarCapabilities {
  /** Read real events (title/location/attendees), not just busy blocks. */
  readEvents: boolean;
  /** Write follow-ups into the dedicated Dhaga calendar. */
  writeEvents: boolean;
}

/**
 * A real event read from a connected calendar. Third-party PII: never logged,
 * never sent to an LLM. `attendees` are emails/display names as the provider
 * returned them.
 */
export interface CalendarEvent {
  id: string;
  title: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
  attendees: string[];
}

/** An event Dhaga writes into its own calendar. All-day events use the UTC date
 *  part of `start`/`end` (matching how the app pins due dates to a day cell). */
export interface CalendarWriteEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  description?: string;
}

/** Token set returned by a provider after an authorization-code exchange or refresh. */
export interface CalendarTokens {
  accessToken: string;
  /** Absent when the provider issues one-shot tokens; then the user re-connects. */
  refreshToken: string | null;
  /** Absolute expiry of accessToken; null when the provider omits one. */
  expiresAt: Date | null;
  scope: string | null;
  /** The connected account's address, when the provider surfaces it (for the UI). */
  accountEmail: string | null;
}

/**
 * One calendar integration. Every method is provider-specific; nothing here
 * assumes OAuth beyond the shape of the flow (getAuthUrl → exchangeCode →
 * refresh), so a username/app-password CalDAV provider can implement it too
 * by treating exchangeCode as "validate credentials".
 */
export interface CalendarProvider {
  /** Stable id persisted on every connection row (e.g. "google", "microsoft"). */
  id: string;
  /** Human label for the connect button ("Google Calendar"). */
  label: string;
  /** True when this provider's app credentials are present in the environment. */
  isConfigured(): boolean;
  /**
   * Build the provider's consent URL. `state` is an opaque, caller-signed
   * CSRF/return token; `redirectUri` is our callback route for this provider.
   * `upgrade` asks for the full tier — it is opt-in and per connection, so the
   * default (false/absent) MUST keep requesting free/busy scopes only.
   */
  getAuthUrl(params: { state: string; redirectUri: string; upgrade?: boolean }): string;
  /** Exchange an authorization code for tokens (called from the callback route). */
  exchangeCode(params: { code: string; redirectUri: string }): Promise<CalendarTokens>;
  /**
   * Refresh an expired access token. `scope` is the connection's stored grant so
   * a provider that must re-send scopes on refresh (Microsoft) never silently
   * narrows an upgraded connection back to free/busy. Returns null when refresh
   * is impossible (no refresh token / revoked) — the caller then marks the
   * connection as needing reconnect rather than crashing the whole read.
   */
  refresh(refreshToken: string, scope?: string | null): Promise<CalendarTokens | null>;
  /** Read busy intervals within `range` for the connected account. */
  listBusy(params: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]>;
  /** Derive the tier from a stored scope string. Absent ⇒ free/busy only. */
  capabilitiesFromScope?(scope: string | null): CalendarCapabilities;
  /** Full tier only: read real events within `range`. */
  listEvents?(params: { accessToken: string; range: TimeRange }): Promise<CalendarEvent[]>;
  /** Full tier only: find-or-create the dedicated Dhaga calendar, returning its
   *  id. `calendarId` is the id we already stored, re-validated by the provider. */
  ensureWriteCalendar?(params: { accessToken: string; calendarId: string | null }): Promise<string>;
  /** Full tier only: create (externalEventId null) or update an event, returning its id. */
  upsertEvent?(params: {
    accessToken: string;
    calendarId: string;
    externalEventId: string | null;
    event: CalendarWriteEvent;
  }): Promise<string>;
  /** Full tier only: delete an event we wrote. Must resolve quietly if it is already gone. */
  deleteEvent?(params: {
    accessToken: string;
    calendarId: string;
    externalEventId: string;
  }): Promise<void>;
}

/** UI-facing summary of a registered provider (no secrets). */
export interface CalendarProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  /** True when the provider implements the opt-in full tier at all. */
  upgradable: boolean;
}
