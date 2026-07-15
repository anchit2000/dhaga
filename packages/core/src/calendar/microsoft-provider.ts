import type { CalendarProvider, CalendarTokens, BusyInterval, TimeRange } from "./types";

/** Privacy-minimal: read calendars, never write; offline_access for refresh. */
const MICROSOFT_SCOPES = "openid email offline_access https://graph.microsoft.com/Calendars.Read";

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}
interface MicrosoftIdTokenPayload {
  email?: string;
  preferred_username?: string;
}
interface MicrosoftCalendarEvent {
  start: { dateTime: string };
  end: { dateTime: string };
  showAs: string;
}
interface MicrosoftCalendarViewResponse {
  value?: MicrosoftCalendarEvent[];
}

/** Microsoft (Graph) calendar provider (see ./types.ts): reads busy blocks via calendarView + showAs. */
export class MicrosoftCalendarProvider implements CalendarProvider {
  id = "microsoft";
  label = "Microsoft Calendar";

  isConfigured(): boolean {
    return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  }

  getAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: MICROSOFT_SCOPES,
      state,
    });
    return `https://login.microsoftonline.com/${this.tenant()}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode({ code, redirectUri }: { code: string; redirectUri: string }): Promise<CalendarTokens> {
    const response = await this.postToken({
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: this.requireClientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: MICROSOFT_SCOPES,
    });
    if (!response.ok) {
      throw new Error(`Microsoft token exchange failed (HTTP ${response.status})`);
    }
    const body = (await response.json()) as MicrosoftTokenResponse;
    return this.toTokens(body, null, this.decodeIdTokenEmail(body.id_token));
  }

  async refresh(refreshToken: string): Promise<CalendarTokens | null> {
    const response = await this.postToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: this.requireClientSecret(),
      scope: MICROSOFT_SCOPES,
    });
    if (!response.ok) {
      return null;
    }
    // Microsoft rotates refresh tokens — keep the new one, falling back to the old.
    const body = (await response.json()) as MicrosoftTokenResponse;
    return this.toTokens(body, refreshToken, null);
  }

  async listBusy({ accessToken, range }: { accessToken: string; range: TimeRange }): Promise<BusyInterval[]> {
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${range.from.toISOString()}&endDateTime=${range.to.toISOString()}&$select=start,end,showAs&$top=100`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Microsoft calendar read failed (HTTP ${response.status})`);
    }
    const body = (await response.json()) as MicrosoftCalendarViewResponse;
    // Keep everything except free; Graph returns UTC dateTimes without a trailing Z.
    return (body.value ?? [])
      .filter((event) => event.showAs !== "free")
      .map((event) => ({ start: this.asUtc(event.start.dateTime), end: this.asUtc(event.end.dateTime) }));
  }

  private tenant(): string {
    return process.env.MICROSOFT_TENANT_ID || "common";
  }

  private postToken(params: Record<string, string>): Promise<Response> {
    return fetch(`https://login.microsoftonline.com/${this.tenant()}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(15_000),
    });
  }

  private toTokens(body: MicrosoftTokenResponse, keepRefresh: string | null, accountEmail: string | null): CalendarTokens {
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? keepRefresh,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
      scope: body.scope ?? null,
      accountEmail,
    };
  }

  private asUtc(dateTime: string): Date {
    return new Date(dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`);
  }

  private requireClientSecret(): string {
    const secret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!secret) {
      throw new Error("MICROSOFT_CLIENT_SECRET is not set");
    }
    return secret;
  }

  private decodeIdTokenEmail(idToken: string | undefined): string | null {
    try {
      const segment = idToken?.split(".")[1];
      if (!segment) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as MicrosoftIdTokenPayload;
      return payload.email ?? payload.preferred_username ?? null;
    } catch {
      return null;
    }
  }
}
