import type { CalendarCapabilities, CalendarProvider } from "./types";

/**
 * Capability derivation: what a connection may do is read off the scope string
 * the provider actually granted, which is already persisted on every connection
 * row. No schema column, no migration, and — the point — no way for an existing
 * free/busy connection to be treated as upgraded. A connection only gains the
 * full tier by re-consenting, which rewrites its stored scope.
 *
 * Pure functions, no I/O. Both shipped providers derive through here so a new
 * provider adds one token list, not a new derivation strategy.
 */

/** The safe default: busy blocks only. Anything unknown resolves to this. */
export const FREEBUSY_ONLY: CalendarCapabilities = Object.freeze({
  readEvents: false,
  writeEvents: false,
});

/** OAuth scope strings are space-delimited; some providers echo them comma-delimited. */
export function scopeHasAny(scope: string | null | undefined, tokens: readonly string[]): boolean {
  if (!scope) return false;
  const granted = new Set(scope.split(/[\s,]+/).filter(Boolean));
  return tokens.some((token) => granted.has(token));
}

/** Build a provider's derivation from its own read/write scope tokens. */
export function capabilitiesFromScopeTokens(
  scope: string | null,
  readTokens: readonly string[],
  writeTokens: readonly string[],
): CalendarCapabilities {
  return {
    readEvents: scopeHasAny(scope, readTokens),
    writeEvents: scopeHasAny(scope, writeTokens),
  };
}

/**
 * The capability of a stored connection. A provider that does not derive (the
 * demo provider, any community free/busy provider) is free/busy only, and a
 * capability is never reported unless the provider actually implements the
 * method behind it — so a free/busy connection is never asked for events.
 */
export function connectionCapabilities(
  provider: CalendarProvider,
  scope: string | null,
): CalendarCapabilities {
  const derived = provider.capabilitiesFromScope?.(scope) ?? FREEBUSY_ONLY;
  return {
    readEvents: derived.readEvents && typeof provider.listEvents === "function",
    writeEvents:
      derived.writeEvents &&
      typeof provider.ensureWriteCalendar === "function" &&
      typeof provider.upsertEvent === "function" &&
      typeof provider.deleteEvent === "function",
  };
}

/** True when the provider offers the opt-in upgrade at all (drives the settings UI). */
export function isUpgradableProvider(provider: CalendarProvider): boolean {
  return typeof provider.capabilitiesFromScope === "function";
}
