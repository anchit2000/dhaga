"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { addClusterLayers } from "./cluster-layers";
import { useMap } from "./context";
import { useClusterInteractions } from "./use-cluster-interactions";
import type { GeoJSONSource } from "maplibre-gl";
import type { MapPointCollection } from "./types";

export interface MapClusterLayerProps {
  data: MapPointCollection;
  clusterColors: [string, string, string];
  clusterThresholds: [number, number];
  pointColor: string;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  onPointClick: (properties: Record<string, unknown>) => void;
}

/** Clustered point layer: one GeoJSON source with `cluster: true`, plus the
 *  cluster circles, their counts, a touch-sized hit area and the points. */
export function MapClusterLayer({
  data,
  clusterColors,
  clusterThresholds,
  pointColor,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  onPointClick,
}: MapClusterLayerProps): null {
  const { map, isLoaded } = useMap();
  const rawId = useId();
  const ids = useMemo(() => {
    const id = rawId.replace(/[^a-zA-Z0-9]/g, "");
    return {
      source: `cluster-source-${id}`,
      clusters: `clusters-${id}`,
      clusterCount: `cluster-count-${id}`,
      pointHit: `point-hit-${id}`,
      point: `point-${id}`,
    };
  }, [rawId]);

  // Creation-time values; later changes flow through the data effect below.
  const initialRef = useRef({ data, clusterColors, clusterThresholds, pointColor });

  useEffect(() => {
    if (!map || !isLoaded) return;
    const initial = initialRef.current;
    return addClusterLayers({
      map,
      ids,
      data: initial.data,
      clusterColors: initial.clusterColors,
      clusterThresholds: initial.clusterThresholds,
      pointColor: initial.pointColor,
      clusterMaxZoom,
      clusterRadius,
    });
  }, [map, isLoaded, ids, clusterMaxZoom, clusterRadius]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    map.getSource<GeoJSONSource>(ids.source)?.setData(data);
  }, [map, isLoaded, ids, data]);

  useClusterInteractions({
    map,
    isLoaded,
    sourceId: ids.source,
    clusterLayerId: ids.clusters,
    pointHitLayerId: ids.pointHit,
    onPointClick,
  });

  return null;
}
