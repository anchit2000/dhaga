import { getGeocodingClient, getGeocodingProvider, hasGeocoding } from "@dhaga/core/src/geocoding";
import { withUserDb } from "@/lib/db/request-scope";
import { MAP_GEOCODE_MAX_PER_PASS } from "@/utils/constants/map";
import { lookupGeocodeCache, saveGeocodeResults, type GeocodeCacheWrite } from "../geocode-cache";
import type { PendingPlace } from "./places";

/**
 * Places a pass is geocoding RIGHT NOW, process-wide. Stashed on globalThis
 * for the same reason the provider registry and the Nominatim rate limiter are
 * (Next re-evaluates modules on HMR): without it, three tabs polling /api/map
 * each spend a full pass on the SAME cities, tripling calls against a service
 * whose policy is "one lookup per place, ever". The rate limiter still makes
 * that impossible to abuse, but it would waste a scarce second-per-request
 * budget re-asking questions already in flight.
 */
const claimStore = globalThis as unknown as { __dhagaMapGeocodeInFlight?: Set<string> };

function claimedKeys(): Set<string> {
  claimStore.__dhagaMapGeocodeInFlight ??= new Set();
  return claimStore.__dhagaMapGeocodeInFlight;
}

/**
 * Geocodes up to MAP_GEOCODE_MAX_PER_PASS unresolved places and caches the
 * answers. Returns how many were written.
 *
 * Runs AFTER the response (see the route's `after()`), never on the request
 * path: the provider allows 1 request/second, so N new cities cost N seconds
 * and the map would otherwise hang behind a spinner. Each load resolves the
 * next batch, so the map fills in over subsequent fetches instead of blocking
 * one.
 *
 * Connection discipline: the cache read and the cache write are two SHORT
 * scoped transactions with the geocoding in between and NO connection held
 * across it — holding one across seconds of network I/O is the pool-timeout
 * bug from PR #92. Each is a single batched statement, never one per place.
 */
export async function resolvePendingPlaces(userId: string, pending: readonly PendingPlace[]): Promise<number> {
  if (!hasGeocoding()) return 0;
  const batch = pending.slice(0, MAP_GEOCODE_MAX_PER_PASS).filter((place) => !claimedKeys().has(place.key));
  if (batch.length === 0) return 0;
  for (const place of batch) claimedKeys().add(place.key);

  try {
    // Re-read: a pass that overlapped this one may already have answered some
    // of these, and the cache is shared across tenants — another user's map
    // load counts. ONE query for the whole batch.
    const fresh = await withUserDb(userId, () => lookupGeocodeCache(batch.map((place) => place.label)));

    const provider = getGeocodingProvider().id;
    const client = getGeocodingClient();
    const writes: GeocodeCacheWrite[] = [];
    let failures = 0;
    let lastError: unknown = null;
    for (const place of batch) {
      if (fresh.has(place.key)) continue;
      try {
        // A `null` here is the provider's definitive "no such place" — the one
        // outcome that is legitimately cacheable as a negative.
        writes.push({ query: place.label, result: await client.geocode(place.label), provider });
      } catch (error) {
        // A THROW is a timeout / network error / non-200: the provider did not
        // answer. Recording it would write resolved=false and pin this place
        // off the map FOREVER because of a transient outage — so it is dropped
        // entirely, not written, and the next pass retries it. Continue rather
        // than abort: one poison string must not stall every place behind it.
        failures += 1;
        lastError = error;
      }
    }

    if (writes.length > 0) await withUserDb(userId, () => saveGeocodeResults(writes));
    if (failures > 0) {
      // PII-safe (mirrors the [card-scan] log): counts and the error class
      // only — never the location text, which is contact data.
      console.warn("[map-geocode] provider lookups failed — not cached as negatives", {
        failures,
        attempted: batch.length,
        name: lastError instanceof Error ? lastError.name : typeof lastError,
        code: (lastError as { code?: unknown } | null)?.code,
      });
    }
    return writes.length;
  } finally {
    for (const place of batch) claimedKeys().delete(place.key);
  }
}
