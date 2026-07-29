import {
  NOMINATIM_DEFAULT_URL,
  NOMINATIM_DEFAULT_USER_AGENT,
  NOMINATIM_MIN_REQUEST_INTERVAL_MS,
  NOMINATIM_TIMEOUT_MS,
} from "./constants";
import { createRateLimiter, type RateLimitedRunner } from "./rate-limit";
import type { GeocodeResult, GeocodingClient } from "./types";

/** The subset of Nominatim's `jsonv2` place object we consume. */
interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
}

/**
 * ONE rate limiter for the whole process, not one per client instance:
 * getGeocodingClient() constructs a fresh client on every call (mirroring the
 * search gateway), so an instance-scoped gate would let N callers each issue
 * their own 1 req/s. Stashed on globalThis for the same reason the provider
 * registry is (../geocoding/index.ts) — Next's HMR re-evaluates modules, and a
 * module-local gate would reset with them.
 */
const limiterStore = globalThis as unknown as { __dhagaNominatimLimiter?: RateLimitedRunner };

function nominatimLimiter(): RateLimitedRunner {
  limiterStore.__dhagaNominatimLimiter ??= createRateLimiter(NOMINATIM_MIN_REQUEST_INTERVAL_MS);
  return limiterStore.__dhagaNominatimLimiter;
}

export interface NominatimGeocodingClientOptions {
  /** Instance base URL — the public one, or your own self-hosted Nominatim. */
  baseUrl?: string;
  /** Identifying User-Agent; the usage policy refuses requests without one. */
  userAgent?: string;
}

/**
 * Default GeocodingClient (see ./types.ts): Nominatim / OpenStreetMap.
 *
 * Chosen because it is the only free geocoder whose terms PERMIT storing the
 * coordinates it returns — Google forbids caching beyond 30 days and Mapbox
 * forbids storage without a paid permanent-geocoding plan — which is what
 * makes the `geocode_cache` table (and therefore "geocode each place once,
 * ever") legal. It is also self-hostable, matching Dhaga's self-hosting
 * posture: point NOMINATIM_URL at your own instance and the rate ceiling is
 * yours to set.
 *
 * Obligations this class discharges: 1 req/s maximum (enforced here, not by
 * callers), a real identifying User-Agent, and — for anything that displays
 * the results — OSM/ODbL attribution (OSM_ATTRIBUTION in ./constants).
 */
export class NominatimGeocodingClient implements GeocodingClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(options: NominatimGeocodingClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? NOMINATIM_DEFAULT_URL).replace(/\/+$/, "");
    this.userAgent = options.userAgent ?? NOMINATIM_DEFAULT_USER_AGENT;
  }

  async geocode(query: string): Promise<GeocodeResult | null> {
    const trimmed = query.trim();
    // Nothing to resolve — skip the request entirely rather than spend a
    // second of the rate budget confirming that "" is not a place.
    if (!trimmed) return null;

    const url = `${this.baseUrl}/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`;
    const response = await nominatimLimiter()(async () =>
      fetch(url, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      }).catch((error: unknown) => {
        // Network error / timeout — transient. Thrown, never returned as
        // null: null means "this place does not exist" and gets cached.
        throw new Error("Nominatim request failed", { cause: error });
      }),
    );

    if (!response.ok) {
      throw new Error(`Nominatim geocode failed (HTTP ${response.status})`);
    }

    const body = (await response.json()) as NominatimPlace[] | unknown;
    const place = Array.isArray(body) ? (body[0] as NominatimPlace | undefined) : undefined;
    // An empty array is Nominatim's definitive "no match" — the one case
    // that is genuinely cacheable as a negative.
    if (!place) return null;

    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      // A matched place with unusable coordinates is a malformed response,
      // not an absent place — don't let it be cached as a negative.
      throw new Error("Nominatim returned a result without usable coordinates");
    }

    return { lat, lng, displayName: place.display_name ?? trimmed };
  }
}
