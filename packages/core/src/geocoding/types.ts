export interface GeocodeResult {
  /** WGS84 latitude in decimal degrees. */
  lat: number;
  /** WGS84 longitude in decimal degrees. */
  lng: number;
  /**
   * The provider's canonical rendering of the place it matched ("London,
   * Greater London, England, United Kingdom"). Kept because the input is
   * free text a user typed on a contact — the display name is the only way
   * a map pin can show WHICH "Springfield" was resolved.
   */
  displayName: string;
}

/**
 * Provider-agnostic forward geocoding — the counterpart to SearchClient
 * (see ../search) and MessagingClient (see ../messaging). Self-hosters and
 * contributors add a provider by implementing this interface and registering
 * it (../geocoding/index.ts); callers never see which provider ran
 * (Dependency Inversion).
 */
export interface GeocodingClient {
  /**
   * Resolves free text ("Bengaluru", "London, UK") to coordinates.
   *
   * Returns `null` ONLY for a definitive "no such place" — the provider
   * answered and matched nothing. That result is safe to cache as a negative.
   * Transport failures (timeout, network error, HTTP 4xx/5xx) THROW instead,
   * so a caller can never mistake "the service was down" for "this place does
   * not exist" and poison its cache with a permanent negative.
   */
  geocode(query: string): Promise<GeocodeResult | null>;
}

export interface GeocodingProvider {
  id: string;
  isConfigured(): boolean;
  createClient(): GeocodingClient;
}
