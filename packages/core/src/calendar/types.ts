/**
 * Provider-agnostic calendar integration — the counterpart to SearchClient
 * (../search) and LLMClient (../llm). A contributor adds a new calendar
 * (Apple/CalDAV, Fastmail, an .ics feed, …) by implementing CalendarProvider
 * and calling registerCalendarProvider() (./index.ts); callers in apps/web
 * never see which provider ran (Open/Closed, Dependency Inversion).
 *
 * We read FREE/BUSY ONLY — busy blocks, never event titles, attendees, or
 * bodies. That is both the privacy contract (contact data is the user's, and
 * their own calendar contents are never stored) and all the scheduling engine
 * needs. Booking is "propose + hand off": we never write to a calendar.
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
   */
  getAuthUrl(params: { state: string; redirectUri: string }): string;
  /** Exchange an authorization code for tokens (called from the callback route). */
  exchangeCode(params: { code: string; redirectUri: string }): Promise<CalendarTokens>;
  /**
   * Refresh an expired access token. Returns null when refresh is impossible
   * (no refresh token / revoked) — the caller then marks the connection as
   * needing reconnect rather than crashing the whole free/busy read.
   */
  refresh(refreshToken: string): Promise<CalendarTokens | null>;
  /** Read busy intervals within `range` for the connected account. */
  listBusy(params: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]>;
}

/** UI-facing summary of a registered provider (no secrets). */
export interface CalendarProviderInfo {
  id: string;
  label: string;
  configured: boolean;
}
