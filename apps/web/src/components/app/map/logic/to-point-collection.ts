import type { MapBounds, MapPointCollection } from "@/components/ui/map";
import type { MapPlace } from "@/types";

/** Property key carrying the place identity through MapLibre. Only the key
 *  travels — MapLibre flattens feature properties, so contacts are looked up
 *  from React state instead of being serialised into the tile. */
export const PLACE_KEY_PROPERTY = "placeKey";

export function toPointCollection(places: readonly MapPlace[]): MapPointCollection {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: { [PLACE_KEY_PROPERTY]: place.key, contacts: place.contacts.length },
    })),
  };
}

/** Bounding box of every place, or null when there is nothing to frame. */
export function toBounds(places: readonly MapPlace[]): MapBounds | null {
  if (places.length === 0) return null;
  let west = places[0].lng;
  let east = places[0].lng;
  let south = places[0].lat;
  let north = places[0].lat;
  for (const place of places) {
    west = Math.min(west, place.lng);
    east = Math.max(east, place.lng);
    south = Math.min(south, place.lat);
    north = Math.max(north, place.lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}
