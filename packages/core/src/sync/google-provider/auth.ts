import type { ContactSyncCapabilities, ContactSyncTokens } from "../provider-types";
import type { GoogleIdTokenPayload, GoogleTokenResponse } from "./api-types";

/**
 * Google OAuth for the People API.
 *
 * SCOPE NOTE (verified against developers.google.com, not assumed): the
 * contacts scopes are **sensitive, not restricted**. Google's sensitive-scope
 * page names the exact operation — "storing a new contact in Google Contacts".
 * That means standard verification (demo video, domain proof, ~10 days) with
 * **no CASA security assessment, no annual third-party audit, and no fee**.
 * Restricted/CASA covers Gmail and Drive. Blog posts claiming otherwise are
 * wrong; check the primary source before budgeting for an audit.
 *
 * `contacts.other.readonly` is deliberately NOT requested: it exposes addresses
 * the user has merely interacted with in Gmail rather than saved, which is not
 * their address book and is not ours to read.
 *
 * Structurally identical to ../../calendar/google-provider/auth.ts. Kept
 * separate rather than shared because the two return different token types and
 * belong to independent grants — collapsing them would couple a contacts
 * reconnect to the calendar connection's lifetime.
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/** Read+write on the user's own contacts. `contacts` implies read. */
export const GOOGLE_CONTACTS_WRITE_SCOPE = "https://www.googleapis.com/auth/contacts";
export const GOOGLE_CONTACTS_READ_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";

const SCOPES = [GOOGLE_CONTACTS_WRITE_SCOPE, "openid", "email"];

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function requireClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return secret;
}

export function getAuthUrl(params: { state: string; redirectUri: string }): string {
  const query = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    // Offline + consent so we actually receive a refresh_token: Google omits it
    // on a repeat authorization unless consent is forced, and without it a
    // background sync stops working an hour after the user connects.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: params.state,
  });
  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
}

function decodeIdTokenEmail(idToken: string | undefined): string | null {
  try {
    const segment = idToken?.split(".")[1];
    if (!segment) return null;
    const payload = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf8"),
    ) as GoogleIdTokenPayload;
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

export async function exchangeCode(params: {
  code: string;
  redirectUri: string;
}): Promise<ContactSyncTokens> {
  const response = await postToken({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
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

/** Google does not take scopes on refresh — it returns the grant already given,
 *  so a refresh here can never narrow the connection. */
export async function refresh(refreshToken: string): Promise<ContactSyncTokens | null> {
  const response = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: requireClientSecret(),
  });
  if (!response.ok) return null;
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

export function capabilitiesFromScope(scope: string | null): ContactSyncCapabilities {
  const granted = new Set((scope ?? "").split(/[\s,]+/).filter(Boolean));
  const write = granted.has(GOOGLE_CONTACTS_WRITE_SCOPE);
  return { read: write || granted.has(GOOGLE_CONTACTS_READ_SCOPE), write };
}
