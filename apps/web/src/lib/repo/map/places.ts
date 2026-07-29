import { normalizeLocationQuery } from "@dhaga/core/src/geocoding";
import type { GeocodeCacheRow } from "@/lib/db/schema";
import type { MapPlace, MapPlaceContact } from "@/types";
import type { LocatableContact } from "./contacts";

/** A distinct place the cache has never answered for — the deferred geocode
 *  pass's work list. `label` normalizes back to `key` by construction. */
export interface PendingPlace {
  key: string;
  label: string;
  contactCount: number;
}

export interface AssembledPlaces {
  places: MapPlace[];
  /** Contacts whose location text is a DEAD END: a cached definitive no-match,
   *  or text that isn't a place at all. Waiting does not help these. */
  unresolvedCount: number;
  /** Contacts whose place simply hasn't been geocoded yet. Kept strictly apart
   *  from unresolvedCount: this one shrinks on its own and tells the client to
   *  refetch, that one never will (see MapPayload in @/types). Swapping the two
   *  fails silently — an empty map that reads as missing data, not as a bug. */
  pendingCount: number;
  pending: PendingPlace[];
}

interface LocationGroup {
  key: string;
  label: string;
  contacts: MapPlaceContact[];
}

/**
 * Groups contacts by their NORMALIZED location key (the same normalizer the
 * geocode cache keys on — two spellings of one city must never become two
 * pins, and never two provider lookups), then splits the groups against the
 * cache rows already fetched for them.
 *
 * Pure and total: no DB, no network, no clock. The caller does the one cache
 * read; this decides what is placed, what is unresolved, and what still needs
 * geocoding.
 */
export function assemblePlaces(
  rows: readonly LocatableContact[],
  cached: ReadonlyMap<string, GeocodeCacheRow>,
): AssembledPlaces {
  const groups = new Map<string, LocationGroup>();
  let unresolvedCount = 0;
  let pendingCount = 0;

  // Sorted first so grouping is a deterministic function of the row SET, not
  // of Postgres's (unordered) row order: the response ETag is a hash of this
  // payload, so an unstable order would churn it and defeat every 304.
  for (const row of [...rows].sort(byNameThenId)) {
    const key = normalizeLocationQuery(row.location);
    if (!key) {
      // Text that survives trim() but normalizes to nothing (",", "-"): not a
      // place, and deliberately never sent to the provider. Unresolved, not
      // pending — no amount of geocoding will ever place it.
      unresolvedCount += 1;
      continue;
    }
    const group = groups.get(key);
    if (group) group.contacts.push({ id: row.id, name: row.name });
    else groups.set(key, { key, label: row.location, contacts: [{ id: row.id, name: row.name }] });
  }

  const places: MapPlace[] = [];
  const pending: PendingPlace[] = [];
  for (const group of groups.values()) {
    const hit = cached.get(group.key);
    if (hit?.resolved && hit.lat !== null && hit.lng !== null) {
      places.push({ key: group.key, label: group.label, lat: hit.lat, lng: hit.lng, contacts: group.contacts });
      continue;
    }
    if (hit) {
      // A cached NEGATIVE ("remote", "WFH") is an ANSWER: the provider ran and
      // matched nothing. Never re-queue it — the provider would be asked again
      // on every single page view — and never call it pending, which would
      // tell the client to keep refetching for a pin that can never appear.
      unresolvedCount += group.contacts.length;
      continue;
    }
    pendingCount += group.contacts.length;
    pending.push({ key: group.key, label: group.label, contactCount: group.contacts.length });
  }

  // Busiest place first (key breaks ties) in both lists: it is the sensible
  // render order, and it makes the bounded deferred pass spend its seconds on
  // the places that put the most contacts on the map.
  places.sort((a, b) => b.contacts.length - a.contacts.length || a.key.localeCompare(b.key));
  pending.sort((a, b) => b.contactCount - a.contactCount || a.key.localeCompare(b.key));
  return { places, unresolvedCount, pendingCount, pending };
}

function byNameThenId(a: LocatableContact, b: LocatableContact): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}
