import type { CalendarProvider, CalendarTokens, BusyInterval, TimeRange } from "./types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";
/** Privacy-minimal: free/busy only, never event titles/attendees/bodies. */
const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar.freebusy";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

interface GoogleIdTokenPayload {
  email?: string;
}

interface GoogleFreeBusyResponse {
  calendars?: { primary?: { busy?: Array<{ start: string; end: string }> } };
}

/**
 * Google Calendar provider (see ./types.ts). Reads free/busy only via the
 * calendar.freebusy scope; one of several CalendarProvider implementations.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  id = "google";
  label = "Google Calendar";

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  getAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode({ code, redirectUri }: { code: string; redirectUri: string }): Promise<CalendarTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: this.requireClientSecret(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Google token exchange failed (HTTP ${response.status})`);
    }
    const body = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? null,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
      scope: body.scope ?? null,
      accountEmail: this.decodeIdTokenEmail(body.id_token),
    };
  }

  async refresh(refreshToken: string): Promise<CalendarTokens | null> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: this.requireClientSecret(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: body.access_token,
      // Google usually omits a fresh refresh_token — keep the one we have.
      refreshToken: body.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
      scope: body.scope ?? null,
      accountEmail: null,
    };
  }

  async listBusy({ accessToken, range }: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]> {
    const response = await fetch(GOOGLE_FREEBUSY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        timeMin: range.from.toISOString(),
        timeMax: range.to.toISOString(),
        items: [{ id: "primary" }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Google free/busy read failed (HTTP ${response.status})`);
    }
    const body = (await response.json()) as GoogleFreeBusyResponse;
    const busy = body.calendars?.primary?.busy ?? [];
    return busy.map((interval) => ({
      start: new Date(interval.start),
      end: new Date(interval.end),
    }));
  }

  private requireClientSecret(): string {
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    if (!secret) {
      throw new Error("GOOGLE_CLIENT_SECRET is not set");
    }
    return secret;
  }

  private decodeIdTokenEmail(idToken: string | undefined): string | null {
    try {
      const segment = idToken?.split(".")[1];
      if (!segment) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as GoogleIdTokenPayload;
      return payload.email ?? null;
    } catch {
      return null;
    }
  }
}
