import { authScopes, refreshScopes } from "./scopes";
import type { CalendarTokens } from "../types";
import type { MicrosoftIdTokenPayload, MicrosoftTokenResponse } from "./graph-types";

/**
 * The Microsoft Entra (v2.0) OAuth half of the provider, kept apart from the
 * Graph calls (./graph) because it changes for different reasons: endpoints,
 * tenants and secrets rather than calendar semantics.
 */

function tenant(): string {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

function requireClientSecret(): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) {
    throw new Error("MICROSOFT_CLIENT_SECRET is not set");
  }
  return secret;
}

function postToken(params: Record<string, string>): Promise<Response> {
  return fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15_000),
  });
}

function toTokens(
  body: MicrosoftTokenResponse,
  keepRefresh: string | null,
  accountEmail: string | null,
): CalendarTokens {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? keepRefresh,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    scope: body.scope ?? null,
    accountEmail,
  };
}

function decodeIdTokenEmail(idToken: string | undefined): string | null {
  try {
    const segment = idToken?.split(".")[1];
    if (!segment) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf8"),
    ) as MicrosoftIdTokenPayload;
    return payload.email ?? payload.preferred_username ?? null;
  } catch {
    return null;
  }
}

/** Consent URL. `upgrade` is the only thing that widens the ask past free/busy. */
export function buildAuthUrl({
  state,
  redirectUri,
  upgrade,
}: {
  state: string;
  redirectUri: string;
  upgrade?: boolean;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: authScopes(upgrade === true),
    state,
  });
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Redeem the authorization code. Deliberately sends NO `scope`: it is optional
 * on this leg and Microsoft narrows the token to whatever we name there, so a
 * fixed constant would hand an upgraded consent back a read-only token. Omitted,
 * the token — and the `scope` we persist off the response, which is what drives
 * capability derivation — reflects what the user actually granted.
 */
export async function exchangeCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<CalendarTokens> {
  const response = await postToken({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed (HTTP ${response.status})`);
  }
  const body = (await response.json()) as MicrosoftTokenResponse;
  return toTokens(body, null, decodeIdTokenEmail(body.id_token));
}

/** Refresh, re-sending the scopes that match the connection's stored grant. */
export async function refreshTokens(
  refreshToken: string,
  scope?: string | null,
): Promise<CalendarTokens | null> {
  const response = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
    scope: refreshScopes(scope),
  });
  if (!response.ok) {
    return null;
  }
  // Microsoft rotates refresh tokens — keep the new one, falling back to the old.
  const body = (await response.json()) as MicrosoftTokenResponse;
  return toTokens(body, refreshToken, null);
}
