import type { CalendarTokens } from "../types";
import type { GoogleIdTokenPayload, GoogleTokenResponse } from "./api-types";

/**
 * Google's OAuth token endpoint: the code exchange and the refresh, unchanged
 * from the free/busy-only version of this provider. Google does not take scopes
 * on refresh — it returns the grant the user already gave — so an upgraded
 * connection can never be silently narrowed back to free/busy here.
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function requireClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error("GOOGLE_CLIENT_SECRET is not set");
  }
  return secret;
}

function decodeIdTokenEmail(idToken: string | undefined): string | null {
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

function postToken(params: Record<string, string>): Promise<Response> {
  return fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15_000),
  });
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<CalendarTokens> {
  const response = await postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
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
    accountEmail: decodeIdTokenEmail(body.id_token),
  };
}

export async function refreshTokens(refreshToken: string): Promise<CalendarTokens | null> {
  const response = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
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
