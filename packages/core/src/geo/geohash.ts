/**
 * Geohash encoding (BRD §6.2 mobile event clustering) — a small, dependency-free
 * pure function, not a new npm package: the algorithm is static and well-known
 * (public-domain, same one used by geohash.org). Deliberately not re-exported
 * from ./index.ts (the package barrel pulls in the Anthropic SDK + zod); deep-import
 * this module directly, same as api/capture.ts.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash precision (chars) for BRD §6.2's "geohash-6" clustering key. */
export const GEOHASH_CLUSTER_PRECISION = 6;

/** Encodes latitude/longitude into a base32 geohash string of the given precision. */
export function encodeGeohash(
  latitude: number,
  longitude: number,
  precision: number = GEOHASH_CLUSTER_PRECISION,
): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let geohash = "";
  let bit = 0;
  let charBits = 0;
  let evenBit = true;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        charBits |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        charBits |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    evenBit = !evenBit;

    if (bit < 4) {
      bit += 1;
    } else {
      geohash += BASE32[charBits];
      bit = 0;
      charBits = 0;
    }
  }
  return geohash;
}
