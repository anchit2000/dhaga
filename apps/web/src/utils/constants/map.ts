/**
 * Map view (GET /api/map) budgets.
 *
 * The single number that shapes this whole feature: the default geocoding
 * provider is capped at 1 request/second (an absolute ToS ceiling the client
 * enforces internally — see packages/core/src/geocoding/rate-limit.ts). So
 * "resolve every uncached city" is a WALL-CLOCK cost of one second per place,
 * and geocoding on the request path would mean a user with 40 new cities
 * waiting 40 seconds for a map. Hence: the response is served from the cache
 * alone, and misses are resolved AFTER the response, in bounded batches.
 */

/**
 * Distinct places one deferred pass will geocode. At 1 req/s this is also the
 * pass's duration in seconds, so it must sit comfortably inside the route's
 * maxDuration (`after()` work counts toward it) — 20s of a 60s budget leaves
 * room for the response itself and a slow provider. A user with more uncached
 * places than this simply fills their map in over the next few loads rather
 * than blowing the function's lifetime on one.
 */
export const MAP_GEOCODE_MAX_PER_PASS = 20;

/* ── Map view UI (/app/map) ───────────────────────────────────────────── */

/**
 * Basemap styles — OpenFreeMap, DELIBERATELY NOT mapcn's default.
 *
 * DO NOT swap these back to `basemaps.cartocdn.com`. mapcn ships CARTO's
 * Positron/Dark-Matter styles as its default basemap, and mapcn's own README
 * states that commercial use of them requires a CARTO Enterprise licence.
 * Dhaga is a commercial product, so shipping that default would be a licence
 * breach. OpenFreeMap serves OpenStreetMap-derived tiles with no API key, no
 * rate limit and no commercial restriction — which is also why the vendored
 * `Map` primitive keeps NO default style of its own and takes `styles` as a
 * REQUIRED prop (`components/ui/map/Map.tsx`): there is no CARTO fallback
 * left to fall back into.
 */
export const MAP_BASEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/**
 * Attribution is a LEGAL requirement, not polish: the tiles are ODbL
 * OpenStreetMap data, and so is the geocoding that placed every pin
 * (Nominatim — see the header of `lib/db/ddl/geocode.ts`).
 *
 * It has to be passed explicitly. OpenFreeMap's style JSON carries NO
 * `attribution` on its sources (verified against the live style), so
 * MapLibre's AttributionControl would otherwise render an EMPTY bar and we
 * would be shipping OSM-derived data with no credit at all. The call site
 * pairs this with `compact: false` for the same reason — the credit stays
 * visible rather than hiding behind an "i" toggle.
 */
export const MAP_ATTRIBUTION_HTML =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/** Opening camera, used until the first fit-to-places (whole world). */
export const MAP_INITIAL_CENTER: [number, number] = [10, 25];
export const MAP_INITIAL_ZOOM = 0.8;

/** Fit-to-places camera. The zoom cap matters: places are city-grain, so
 *  flying closer would imply a street-level precision the data never has. */
export const MAP_FIT_PADDING = 48;
export const MAP_FIT_MAX_ZOOM = 9;

/**
 * Refetch cadence while `pendingCount > 0`.
 *
 * A first-ever load legitimately returns zero places: GET /api/map answers
 * from the geocode cache and schedules the lookups after the response, at the
 * provider's 1 request/second. So the client has to come back for the result —
 * and on a human scale, not a millisecond one. Two facts set the interval: a
 * pass is up to MAP_GEOCODE_MAX_PER_PASS seconds long, and it writes its
 * answers once at the end, so polling faster than a pass only burns
 * invocations to be told 304. The ceiling is the backstop: a place the
 * provider will never resolve must not leave a tab polling forever — after
 * this many attempts the map stops and a reload picks up where it left off.
 */
export const MAP_POLL_INTERVAL_MS = 6_000;
export const MAP_POLL_MAX_ATTEMPTS = 20;

/** One accent colour — amber, matching GRAPH_NODE_COLORS.contact. */
export const MAP_POINT_COLOR = "#e2a44c";
/** Cluster fill ramp, small → large. */
export const MAP_CLUSTER_COLORS: [string, string, string] = ["#e2a44c", "#c8822c", "#a35f16"];
/** Point-count thresholds for that ramp — tuned for a personal network. */
export const MAP_CLUSTER_THRESHOLDS: [number, number] = [10, 50];
