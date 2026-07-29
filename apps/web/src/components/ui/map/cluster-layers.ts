import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapPointCollection } from "./types";

/** Fontstack for the cluster counts. NOT upstream mapcn's "Open Sans Semibold":
 *  that fontstack 404s on OpenFreeMap's glyph endpoint (verified), which would
 *  silently leave every cluster unlabelled. OpenFreeMap serves Noto Sans. */
const CLUSTER_FONT = ["Noto Sans Bold"];
/** Invisible tap target around each point: radius 22px ⇒ a 44px touch target. */
const POINT_HIT_RADIUS = 22;

export interface ClusterLayerIds {
  source: string;
  clusters: string;
  clusterCount: string;
  pointHit: string;
  point: string;
}

/** Adds the clustered source and its four layers, and returns their teardown.
 *  Kept out of the component so the React file stays about lifecycle only. */
export function addClusterLayers({
  map,
  ids,
  data,
  clusterColors,
  clusterThresholds,
  pointColor,
  clusterMaxZoom,
  clusterRadius,
}: {
  map: MapLibreMap;
  ids: ClusterLayerIds;
  data: MapPointCollection;
  clusterColors: [string, string, string];
  clusterThresholds: [number, number];
  pointColor: string;
  clusterMaxZoom: number;
  clusterRadius: number;
}): () => void {
  map.addSource(ids.source, {
    type: "geojson",
    data,
    cluster: true,
    clusterMaxZoom,
    clusterRadius,
  });

  map.addLayer({
    id: ids.clusters,
    type: "circle",
    source: ids.source,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        clusterColors[0],
        clusterThresholds[0],
        clusterColors[1],
        clusterThresholds[1],
        clusterColors[2],
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        18,
        clusterThresholds[0],
        26,
        clusterThresholds[1],
        34,
      ],
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(0,0,0,0.35)",
      "circle-opacity": 0.9,
    },
  });

  map.addLayer({
    id: ids.clusterCount,
    type: "symbol",
    source: ids.source,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": CLUSTER_FONT,
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#1a1206" },
  });

  // Transparent but still queryable, under the visible dot — the touch target.
  map.addLayer({
    id: ids.pointHit,
    type: "circle",
    source: ids.source,
    filter: ["!", ["has", "point_count"]],
    paint: { "circle-radius": POINT_HIT_RADIUS, "circle-opacity": 0 },
  });

  map.addLayer({
    id: ids.point,
    type: "circle",
    source: ids.source,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": pointColor,
      "circle-radius": 7,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "rgba(0,0,0,0.35)",
    },
  });

  return () => {
    for (const layerId of [ids.clusterCount, ids.point, ids.pointHit, ids.clusters]) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    if (map.getSource(ids.source)) map.removeSource(ids.source);
  };
}
