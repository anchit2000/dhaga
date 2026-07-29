import type { MapPayload } from "@/types";
import { lookupGeocodeCache } from "../geocode-cache";
import { fetchLocatableContacts } from "./contacts";
import { assemblePlaces, type PendingPlace } from "./places";

export { fetchLocatableContacts, type LocatableContact } from "./contacts";
export { assemblePlaces, type AssembledPlaces, type PendingPlace } from "./places";
export { resolvePendingPlaces } from "./resolve";

export interface MapView {
  payload: MapPayload;
  /** Places with no cached answer yet. The route hands these to the deferred
   *  geocode pass — they are NOT part of the client contract. */
  pending: PendingPlace[];
}

/**
 * The whole map in one read, served from the geocode cache alone.
 *
 * TWO queries, both on the memoized per-request connection: every contact's
 * location in one, every cached geocode for the distinct places in one. No
 * geocoding happens here — see resolvePendingPlaces for why that runs after
 * the response.
 *
 * CALLING THIS DIRECTLY FROM AN RSC PAGE DOES NOT GEOCODE ANYTHING. This
 * function only reports what is already cached; the deferred pass is scheduled
 * by GET /api/map's `after()`, not here. A page that renders from this without
 * scheduling its own `after(() => resolvePendingPlaces(userId, pending))` will
 * show a map that never fills in — payload.pendingCount stuck at the same
 * number forever, with nothing on earth about to change it. Fetching
 * /api/map instead is the path that already handles this.
 */
export async function fetchMapView(): Promise<MapView> {
  const { located, missingCount } = await fetchLocatableContacts();
  const cached = await lookupGeocodeCache(located.map((row) => row.location));
  const { places, unresolvedCount, pendingCount, pending } = assemblePlaces(located, cached);
  return { payload: { places, unresolvedCount, pendingCount, missingCount }, pending };
}
