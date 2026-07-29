import { boolean, doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Resolved coordinates for a free-text location, keyed by
 * normalizeLocationQuery() output. Shared across tenants by design (public
 * reference data, and "geocode once, ever" is only achievable process-wide) —
 * the full reasoning lives with the DDL in db/ddl/geocode.ts.
 *
 * `resolved = false` with NULL lat/lng is a cached NEGATIVE: the provider
 * answered and matched nothing. A DB CHECK keeps the two in sync.
 */
export const geocodeCache = pgTable("geocode_cache", {
  queryKey: text("query_key").primaryKey(),
  queryText: text("query_text").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  displayName: text("display_name"),
  resolved: boolean("resolved").notNull().default(false),
  provider: text("provider").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GeocodeCacheRow = typeof geocodeCache.$inferSelect;
