import { inArray, sql } from "drizzle-orm";
import { normalizeLocationQuery, type GeocodeResult } from "@dhaga/core/src/geocoding";
import { getDb } from "@/lib/db/request-scope";
import { geocodeCache, type GeocodeCacheRow } from "@/lib/db/schema";

/** A completed lookup to persist. `result: null` = the provider definitively
 *  matched nothing, which is stored as a negative so the same junk string
 *  ("remote", "WFH") never costs another request. NEVER pass null for a
 *  failed request — see GeocodingClient.geocode's contract. */
export interface GeocodeCacheWrite {
  /** The raw location text; normalized here so callers can't key it wrong. */
  query: string;
  result: GeocodeResult | null;
  /** Provider id that produced this answer (getGeocodingProvider().id). */
  provider: string;
}

/**
 * Cached geocodes for many location strings in ONE query, keyed by
 * normalizeLocationQuery() output — pass the raw text, match on the same key
 * the writer used.
 *
 * There is deliberately no single-string variant: a per-contact lookup helper
 * is exactly how this ends up as a getDb() fan-out inside a loop, the bug
 * class behind PRs #60/#96. Collect the distinct locations first, ask once.
 */
export async function lookupGeocodeCache(queries: readonly string[]): Promise<Map<string, GeocodeCacheRow>> {
  const keys = [...new Set(queries.map(normalizeLocationQuery).filter(Boolean))];
  if (keys.length === 0) return new Map();

  const db = await getDb();
  const rows = await db.select().from(geocodeCache).where(inArray(geocodeCache.queryKey, keys));
  return new Map(rows.map((row) => [row.queryKey, row]));
}

/**
 * Upserts many lookups in ONE statement. Callers running outside a request
 * (a batch geocode job) must wrap the whole run in a single
 * `withUserDb(userId, …)` so the batch holds one connection, not one per row.
 *
 * Conflict target is the column, not a constraint name: unlike `settings`,
 * this table's primary key is (query_key) in every mode — packages/ee does not
 * tenant-scope it (see db/ddl/geocode.ts), so there is no composite-PK variant
 * to dodge.
 */
export async function saveGeocodeResults(entries: readonly GeocodeCacheWrite[]): Promise<void> {
  // Postgres rejects an ON CONFLICT DO UPDATE that touches the same row twice
  // in one statement, so collapse duplicate keys first (last write wins).
  const byKey = new Map<string, GeocodeCacheWrite & { key: string }>();
  for (const entry of entries) {
    const key = normalizeLocationQuery(entry.query);
    if (key) byKey.set(key, { ...entry, key });
  }
  if (byKey.size === 0) return;

  const values = [...byKey.values()].map((entry) => ({
    queryKey: entry.key,
    queryText: entry.query.trim(),
    lat: entry.result?.lat ?? null,
    lng: entry.result?.lng ?? null,
    displayName: entry.result?.displayName ?? null,
    resolved: entry.result !== null,
    provider: entry.provider,
  }));

  const db = await getDb();
  await db
    .insert(geocodeCache)
    .values(values)
    .onConflictDoUpdate({
      target: geocodeCache.queryKey,
      set: {
        queryText: sql`excluded.query_text`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        displayName: sql`excluded.display_name`,
        resolved: sql`excluded.resolved`,
        provider: sql`excluded.provider`,
        // A re-lookup refreshes the age even when the answer is unchanged —
        // this is the column any future staleness policy would read.
        checkedAt: sql`now()`,
      },
    });
}
