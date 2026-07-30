/**
 * Option shaping + the browser-zone read for `TimezoneSetting`. Split out so the
 * card itself stays under the 150-line rule; nothing here is React state.
 */

export interface ZoneOption {
  value: string;
  label: string;
}

/**
 * `{ value, label }` is the shape Base UI special-cases: the label is what its
 * default (collator `contains`) filter matches and what the input displays, the
 * value is the zone id we submit. Swapping underscores for spaces in the label is
 * the whole point — it lets someone type "new york" and find America/New_York.
 */
export function toZoneOption(zone: string): ZoneOption {
  return { value: zone, label: zone.replace(/_/g, " ") };
}

/** Zone id with underscores softened, for prose ("Use detected zone (…)"). */
export function humaniseZone(zone: string): string {
  return zone.replace(/_/g, " ");
}

// The browser's own zone can't change mid-session, so there is nothing to
// subscribe to; these three feed `useSyncExternalStore`, which is how the card
// reads a client-only value without a hydration mismatch (server snapshot: null)
// and without a setState-in-effect.
export function subscribeNever(): () => void {
  return () => {};
}

export function readBrowserZone(): string | null {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function readNoZone(): string | null {
  return null;
}
