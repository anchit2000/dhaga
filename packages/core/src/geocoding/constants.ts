/**
 * Geocoding tuning values. A dedicated module (rather than the top of
 * nominatim-client.ts, the way ../search/firecrawl-client.ts keeps its retry
 * knobs local) because the client, the registry, and the rate-limiter tests
 * all need the same numbers — one source of truth, per CLAUDE.md's constants
 * rule.
 */

/** Public Nominatim instance. Override with NOMINATIM_URL (self-hosted instance). */
export const NOMINATIM_DEFAULT_URL = "https://nominatim.openstreetmap.org";

/**
 * Nominatim's usage policy REQUIRES a genuine identifying User-Agent naming
 * the application and a contact/reference — requests without one are refused.
 * Override with NOMINATIM_USER_AGENT (a self-hoster running against the public
 * instance should name their own deployment).
 */
export const NOMINATIM_DEFAULT_USER_AGENT = "Dhaga/0.1 (+https://github.com/anchit2000/dhaga)";

/**
 * Nominatim's usage policy caps the public instance at ABSOLUTE MAXIMUM 1
 * request per second. This is not a performance knob — exceeding it gets the
 * deployment blocked. NominatimGeocodingClient enforces it internally so no
 * caller can breach it by looping (see ./rate-limit).
 */
export const NOMINATIM_MIN_REQUEST_INTERVAL_MS = 1_000;

/** Per-request timeout. Generous: a queued request already waited its turn. */
export const NOMINATIM_TIMEOUT_MS = 10_000;

/**
 * OSM data is ODbL — any surface displaying coordinates derived from it must
 * carry this attribution. Exported so the map UI has one canonical string.
 */
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
