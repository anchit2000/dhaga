/**
 * Geocode cache for the map view: free-text contact locations ("Bengaluru",
 * "London") resolved to coordinates. Kept separate from core.ts the same way
 * auth/search/calendar DDL is (concatenated in ./index.ts). Idempotent,
 * boot-time applied — the project's "boring migrations" convention.
 *
 * WHY A CACHE IS MANDATORY, NOT AN OPTIMISATION: the default provider
 * (Nominatim/OpenStreetMap) caps requests at 1/second and its usage policy
 * forbids bulk or systematic querying. Storing the answer is what makes the
 * feature legal — Nominatim is the only free geocoder that PERMITS storing
 * returned coordinates (Google forbids caching past 30 days; Mapbox forbids
 * storage without a paid plan). One lookup per distinct place, ever.
 *
 * TENANCY: this table is deliberately SHARED, not tenant-scoped — the only
 * core table besides the messaging routing tables that is. Reasons, in order
 * of weight:
 *   1. It holds public reference data, not user data: "london" → 51.5/-0.12
 *      is the same fact for everyone and says nothing about who knows whom.
 *   2. Correctness. Tenant-scoping it under packages/ee's RLS would need the
 *      key to become (user_id, query_key) — otherwise tenant B's INSERT of
 *      "london" collides with a row RLS hides from it, and an upsert would
 *      silently no-op while every read still missed: an invisible loop
 *      re-querying the provider forever. That is precisely the ToS breach
 *      this table exists to prevent, and it fails SILENTLY.
 *   3. "Geocode once, ever" is only achievable process-wide; per-tenant it
 *      becomes "once per tenant", multiplying calls against a public service
 *      that forbids exactly that pattern.
 * Accepted residual risk: any tenant connection can read the SET of place
 * names cached across the deployment (not who owns them). No RLS policy is
 * created here — the table is simply absent from packages/ee's TENANT_TABLES
 * list, so it stays a plain table on both the session and transaction pooler.
 */
export const GEOCODE_DDL = `
CREATE TABLE IF NOT EXISTS geocode_cache (
  -- normalizeLocationQuery() output (@dhaga/core/src/geocoding) — every read
  -- and write MUST key on that function, or the cache silently misses.
  query_key text PRIMARY KEY,
  -- The text as first seen, kept for debugging a bad normalization.
  query_text text NOT NULL,
  lat double precision,
  lng double precision,
  display_name text,
  -- Negative caching: a place the provider definitively could not resolve is
  -- stored with resolved = false and NULL coordinates, so unresolvable junk
  -- ("WFH", "remote") costs one lookup rather than one per page view. A
  -- boolean rather than inferring it from NULL coordinates: reads filter on
  -- it directly, with no three-valued-logic traps, and the CHECK below makes
  -- a half-written row (resolved with no coordinates) impossible.
  resolved boolean NOT NULL DEFAULT false,
  provider text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT geocode_cache_resolved_coords_ck CHECK (
    (resolved AND lat IS NOT NULL AND lng IS NOT NULL) OR
    (NOT resolved AND lat IS NULL AND lng IS NULL)
  )
);
`;
