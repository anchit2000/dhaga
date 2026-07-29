"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, MapClusterLayer, MapControls } from "@/components/ui/map";
import {
  MAP_ATTRIBUTION_HTML,
  MAP_BASEMAP_STYLES,
  MAP_CLUSTER_COLORS,
  MAP_CLUSTER_THRESHOLDS,
  MAP_INITIAL_CENTER,
  MAP_INITIAL_ZOOM,
  MAP_POINT_COLOR,
} from "@/utils/constants/map";
import { PLACE_KEY_PROPERTY, toBounds, toPointCollection } from "../logic/to-point-collection";
import { PlaceSheet } from "../PlaceSheet";
import { FitToPlaces } from "./FitToPlaces";
import type { MapPlace } from "@/types";

/** WebGL canvas — only ever reached through MapView's `ssr: false` import.
 *  Sized like the graph canvas (70vh inside the /app shell), never `h-screen`. */
export function MapCanvas({ places }: { places: readonly MapPlace[] }): React.ReactElement {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const data = useMemo(() => toPointCollection(places), [places]);
  const bounds = useMemo(() => toBounds(places), [places]);
  const selected = places.find((place) => place.key === selectedKey) ?? null;

  const handlePointClick = useCallback((properties: Record<string, unknown>) => {
    const key = properties[PLACE_KEY_PROPERTY];
    if (typeof key === "string") setSelectedKey(key);
  }, []);

  return (
    <>
      <Map
        styles={MAP_BASEMAP_STYLES}
        center={MAP_INITIAL_CENTER}
        zoom={MAP_INITIAL_ZOOM}
        // Attribution is non-negotiable and non-compact: OpenFreeMap's style
        // ships none of its own, and OSM credit must not hide behind a toggle.
        attributionControl={{ compact: false, customAttribution: MAP_ATTRIBUTION_HTML }}
        className="h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-seam bg-ink"
      >
        <FitToPlaces bounds={bounds} />
        <MapClusterLayer
          data={data}
          clusterColors={MAP_CLUSTER_COLORS}
          clusterThresholds={MAP_CLUSTER_THRESHOLDS}
          pointColor={MAP_POINT_COLOR}
          onPointClick={handlePointClick}
        />
        <MapControls />
      </Map>
      <PlaceSheet place={selected} onClose={() => setSelectedKey(null)} />
    </>
  );
}
