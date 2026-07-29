import { capabilitiesFromScopeTokens } from "../capability";
import type { CalendarCapabilities } from "../types";

/**
 * What this provider asks Microsoft for, and what a stored grant means.
 *
 * The default ask is unchanged and must stay unchanged: every connection made
 * before the full tier existed holds exactly MICROSOFT_SCOPES, and re-asking for
 * that same string is what keeps those connections working without a reconnect.
 */

/** Privacy-minimal default: read calendars, never write; offline_access for refresh. */
const MICROSOFT_SCOPES = "openid email offline_access https://graph.microsoft.com/Calendars.Read";

/**
 * The opt-in upgrade, requested only when the user explicitly picks it.
 * Calendars.ReadWrite supersedes Calendars.Read, and Graph has no
 * app-created-calendars-only scope, so this is the narrowest ask that can create
 * the secondary Dhaga calendar.
 */
const MICROSOFT_UPGRADE_SCOPES =
  "openid email offline_access https://graph.microsoft.com/Calendars.ReadWrite";

/**
 * Only Calendars.ReadWrite marks a connection as upgraded. Graph echoes granted
 * scopes sometimes bare, sometimes fully qualified, so both forms count.
 *
 * Calendars.Read is deliberately NOT in this list, and read and write therefore
 * share it: every pre-existing free/busy connection was granted Calendars.Read,
 * so treating it as "may read events" would silently start reading titles,
 * locations and attendees for users who never opted in. Reading real events
 * requires exactly the same re-consent that writing them does.
 */
const UPGRADE_TOKENS: readonly string[] = [
  "https://graph.microsoft.com/Calendars.ReadWrite",
  "Calendars.ReadWrite",
];

/** Which scopes the consent screen should ask for. */
export function authScopes(upgrade: boolean): string {
  return upgrade ? MICROSOFT_UPGRADE_SCOPES : MICROSOFT_SCOPES;
}

/** Tier of a stored grant. Anything short of the upgrade is free/busy only. */
export function capabilitiesFromScope(scope: string | null): CalendarCapabilities {
  return capabilitiesFromScopeTokens(scope, UPGRADE_TOKENS, UPGRADE_TOKENS);
}

/**
 * The scope string a refresh must re-send. Microsoft narrows the new access
 * token to whatever the refresh asks for, so posting the default constant on an
 * upgraded connection would silently drop write access and break write-out.
 * Never echo the stored scope back verbatim: Graph adds tokens (`profile`, …)
 * that are not always re-requestable.
 */
export function refreshScopes(scope: string | null | undefined): string {
  return authScopes(capabilitiesFromScope(scope ?? null).writeEvents);
}
