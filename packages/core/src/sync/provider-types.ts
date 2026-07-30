import type { ContactSyncTarget } from "./types";

/**
 * Server-side address-book providers (Google People, Microsoft Graph) — the
 * OAuth half of contact sync.
 *
 * Why this exists alongside `ContactSyncTarget`: a target is the *I/O* contract
 * (list/create/patch) and is deliberately credential-free, because the device
 * target on mobile has no credentials at all — it just talks to the OS. A server
 * provider additionally has to obtain and refresh an OAuth grant, and it must
 * produce a *different target per connected account*. So the provider owns the
 * auth flow and mints a token-bound target; everything downstream (the merge,
 * the reconcile, the ack) keeps talking to the plain `ContactSyncTarget` it
 * already understands and never learns that OAuth happened.
 *
 * Shaped after CalendarProvider (../calendar/types.ts) on purpose: same
 * getAuthUrl → exchangeCode → refresh flow, same "tokens passed per call, no
 * per-user state on the provider" rule, so the two integrations read alike.
 *
 * WHY SEPARATE FROM THE CALENDAR CONNECTION: writing to someone's address book
 * and reading their calendar are independent decisions, and Google/Microsoft
 * grant them as independent scopes. Sharing one connection row would mean
 * re-consenting to calendar in order to sync contacts, and a reconnect on
 * either feature could narrow the other's grant. They stay separate.
 */

/** Token set from an authorization-code exchange or a refresh. */
export interface ContactSyncTokens {
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
 * What a stored grant actually permits. Derived from the scope string the
 * provider granted — never a column, never assumed — exactly as
 * ../calendar/capability.ts does it, and for the same reason: a connection must
 * not gain a capability because a later release started asking for more.
 */
export interface ContactSyncCapabilities {
  /** Read the account's contacts. */
  read: boolean;
  /** Create and update contacts in the account. */
  write: boolean;
}

export const CONTACT_SYNC_NO_ACCESS: ContactSyncCapabilities = Object.freeze({
  read: false,
  write: false,
});

export interface ContactSyncProvider {
  /** Stable id persisted on every connection row ("google", "microsoft"). */
  id: string;
  /** Human label for the connect button ("Google Contacts"). */
  label: string;
  /** True when this provider's app credentials are present in the environment. */
  isConfigured(): boolean;
  /** Build the consent URL. `state` is an opaque, caller-signed CSRF/return token. */
  getAuthUrl(params: { state: string; redirectUri: string }): string;
  /** Exchange an authorization code for tokens (called from the callback route). */
  exchangeCode(params: { code: string; redirectUri: string }): Promise<ContactSyncTokens>;
  /**
   * Refresh an expired access token. `scope` is the connection's stored grant so
   * a provider that must re-send scopes on refresh (Microsoft) cannot silently
   * narrow the grant. Returns null when refresh is impossible (no refresh token,
   * or revoked) so the caller can mark the connection `needs_reconnect` rather
   * than failing the whole run.
   */
  refresh(refreshToken: string, scope?: string | null): Promise<ContactSyncTokens | null>;
  /** Derive capabilities from a stored scope string. */
  capabilitiesFromScope(scope: string | null): ContactSyncCapabilities;
  /** Mint the I/O target for one connected account. */
  createTarget(params: { accessToken: string }): ContactSyncTarget;
}

/** UI-facing summary of a registered provider (no secrets). */
export interface ContactSyncProviderInfo {
  id: string;
  label: string;
  configured: boolean;
}
