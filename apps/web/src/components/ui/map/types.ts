/** Minimal GeoJSON shapes for the point/cluster layer.
 *
 *  Declared here rather than imported from `geojson` on purpose: `@types/geojson`
 *  reaches us only transitively (maplibre-gl depends on it), and this map needs
 *  exactly one geometry type. These are structurally assignable to the full
 *  GeoJSON types MapLibre expects. */

export interface MapPointFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  /** Kept flat and primitive: MapLibre serialises feature properties, so nested
   *  objects come back as strings. Carry an id and look the rest up in React. */
  properties: Record<string, string | number>;
}

export interface MapPointCollection {
  type: "FeatureCollection";
  features: MapPointFeature[];
}

/** [west, south] / [east, north] — a `LngLatBoundsLike` MapLibre accepts directly. */
export type MapBounds = [[number, number], [number, number]];
