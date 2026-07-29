import { NominatimGeocodingClient } from "./nominatim-client";
import type { GeocodingClient, GeocodingProvider } from "./types";

export type { GeocodeResult, GeocodingClient, GeocodingProvider } from "./types";
export { NominatimGeocodingClient, type NominatimGeocodingClientOptions } from "./nominatim-client";
export { normalizeLocationQuery } from "./normalize";
export { createRateLimiter, type RateLimitedRunner } from "./rate-limit";
export {
  NOMINATIM_DEFAULT_URL,
  NOMINATIM_DEFAULT_USER_AGENT,
  NOMINATIM_MIN_REQUEST_INTERVAL_MS,
  NOMINATIM_TIMEOUT_MS,
  OSM_ATTRIBUTION,
} from "./constants";

/**
 * Geocoding gateway — mirrors the search gateway (../search/index.ts). This is
 * the only place a concrete geocoder is chosen. GEOCODING_PROVIDER selects the
 * implementation; adding one (a self-hosted Photon/Pelias, a paid provider a
 * deployment already licenses…) means a new GeocodingClient implementation
 * plus a registerGeocodingProvider call — zero changes to callers
 * (Open/Closed, Dependency Inversion).
 */
const providerStore = globalThis as unknown as {
  __dhagaGeocodingProviders?: Map<string, GeocodingProvider>;
  __dhagaGeocodingProviderOverride?: string;
};

function geocodingProviders(): Map<string, GeocodingProvider> {
  providerStore.__dhagaGeocodingProviders ??= new Map();
  const providers = providerStore.__dhagaGeocodingProviders;
  if (!providers.has("nominatim")) {
    providers.set("nominatim", {
      id: "nominatim",
      // No API key exists for Nominatim — the public instance is open (under
      // its usage policy), so the built-in provider is always configured and
      // geocoding needs no setup to work when self-hosting.
      isConfigured: () => true,
      createClient: () =>
        new NominatimGeocodingClient({
          baseUrl: process.env.NOMINATIM_URL,
          userAgent: process.env.NOMINATIM_USER_AGENT,
        }),
    });
  }
  return providers;
}

export function registerGeocodingProvider(provider: GeocodingProvider): () => void {
  if (!provider.id.trim()) throw new Error("Geocoding provider id cannot be empty");
  geocodingProviders().set(provider.id, provider);
  return () => geocodingProviders().delete(provider.id);
}

export function selectGeocodingProvider(id: string | null): void {
  providerStore.__dhagaGeocodingProviderOverride = id ?? undefined;
}

export function getGeocodingProvider(): GeocodingProvider {
  const id = providerStore.__dhagaGeocodingProviderOverride || process.env.GEOCODING_PROVIDER || "nominatim";
  const provider = geocodingProviders().get(id);
  if (!provider) throw new Error(`Unknown GEOCODING_PROVIDER "${id}"`);
  return provider;
}

/** True when a geocoding provider is configured; map features degrade when not. */
export function hasGeocoding(): boolean {
  return getGeocodingProvider().isConfigured();
}

export function getGeocodingClient(): GeocodingClient {
  return getGeocodingProvider().createClient();
}
