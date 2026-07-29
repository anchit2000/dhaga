"use client";

import { useEffect } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";

/** Click + cursor wiring for the cluster layer. Clicking a cluster zooms to the
 *  level where it breaks apart; clicking a point hands its properties back. */
export function useClusterInteractions({
  map,
  isLoaded,
  sourceId,
  clusterLayerId,
  pointHitLayerId,
  onPointClick,
}: {
  map: MapLibreMap | null;
  isLoaded: boolean;
  sourceId: string;
  clusterLayerId: string;
  pointHitLayerId: string;
  onPointClick: (properties: Record<string, unknown>) => void;
}): void {
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleClusterClick = (event: MapLayerMouseEvent): void => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id as number | undefined;
      if (clusterId === undefined || feature?.geometry.type !== "Point") return;
      const [lng, lat] = feature.geometry.coordinates;
      const source = map.getSource<GeoJSONSource>(sourceId);
      if (!source) return;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({ center: [lng, lat], zoom });
      });
    };

    const handlePointClick = (event: MapLayerMouseEvent): void => {
      const properties = event.features?.[0]?.properties;
      if (properties) onPointClick(properties);
    };

    const showPointer = (): void => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = (): void => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", clusterLayerId, handleClusterClick);
    map.on("click", pointHitLayerId, handlePointClick);
    map.on("mouseenter", clusterLayerId, showPointer);
    map.on("mouseleave", clusterLayerId, clearPointer);
    map.on("mouseenter", pointHitLayerId, showPointer);
    map.on("mouseleave", pointHitLayerId, clearPointer);

    return () => {
      map.off("click", clusterLayerId, handleClusterClick);
      map.off("click", pointHitLayerId, handlePointClick);
      map.off("mouseenter", clusterLayerId, showPointer);
      map.off("mouseleave", clusterLayerId, clearPointer);
      map.off("mouseenter", pointHitLayerId, showPointer);
      map.off("mouseleave", pointHitLayerId, clearPointer);
    };
  }, [map, isLoaded, sourceId, clusterLayerId, pointHitLayerId, onPointClick]);
}
