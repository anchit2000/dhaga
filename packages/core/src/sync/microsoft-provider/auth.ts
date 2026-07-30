import type { ContactSyncCapabilities, ContactSyncTokens } from "../provider-types";
import type { MicrosoftIdTokenPayload, MicrosoftTokenResponse } from "./api-types";

/**
 * Microsoft identity platform OAuth for Graph contacts.
 *
 * Two Microsoft-specific traps, both already learned the hard way in the
 * calendar provider:
 *  - scopes MUST be re-sent on refresh, or the refreshed token comes back with a
 *    narrower grant than the user gave;
 *  - the token response may omit `scope` entirely, so the caller keeps the
 *    stored grant rather than overwriting it with null.
 */

const TENANT = "common";
const AUTH_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const MICROSOFT_CONTACTS_WRITE_SCOPE = "Contacts.ReadWrite";
export const MICROSOFT_CONTACTS_READ_SCOPE = "Contacts.Read";

/** offline_access is what yields a refresh token at all. */
const SCOPES = [MICROSOFT_CONTACTS_WRITE_SCOPE, "offline_access", "openid", "email"];

export function isConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

function requireClientSecret(): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) throw new Error("MICROSOFT_CLIENT_SECRET is not set");
  return secret;
}

export function getAuthUrl(params: { state: string; redirectUri: string }): string {
  const query = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: params.redirectUri,
    response_mode: "query",
    scope: SCOPES.join(" "),
    state: params.state,
  });
  return `${AUTH_URL}?${query.toString()}`;
}

function decodeIdTokenEmail(idToken: string | undefined): string | null {
  try {
    const segment = idToken?.split(".")[1];
    if (!segment) return null;
    const payload = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf8"),
    ) as MicrosoftIdTokenPayload;
    return payload.email ?? payload.preferred_username ?? null;
  } catch {
    return null;
  }
}

function postToken(params: Record<string, string>): Promise<Response> {
  return fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15_000),
  });
}

export async function exchangeCode(params: {
  code: string;
  redirectUri: string;
}): Promise<ContactSyncTokens> {
  const response = await postToken({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
    scope: SCOPES.join(" "),
  });
  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed (HTTP ${response.status})`);
  }
  const body = (await response.json()) as MicrosoftTokenResponse;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    scope: body.scope ?? null,
    accountEmail: decodeIdTokenEmail(body.id_token),
  };
}

/** `scope` is the connection's stored grant — re-sent so the refresh cannot
 *  silently narrow it. */
export async function refresh(
  refreshToken: string,
  scope?: string | null,
): Promise<ContactSyncTokens | null> {
  const response = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
    scope: scope?.trim() || SCOPES.join(" "),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as MicrosoftTokenResponse;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    scope: body.scope ?? null,
    accountEmail: null,
  };
}

/** Graph echoes scopes as full URIs on some tenants, so both the bare name and
 *  the `https://graph.microsoft.com/…` form are accepted. */
export function capabilitiesFromScope(scope: string | null): ContactSyncCapabilities {
  const granted = new Set(
    (scope ?? "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((token) => token.replace("https://graph.microsoft.com/", "")),
  );
  const write = granted.has(MICROSOFT_CONTACTS_WRITE_SCOPE);
  return { read: write || granted.has(MICROSOFT_CONTACTS_READ_SCOPE), write };
}
