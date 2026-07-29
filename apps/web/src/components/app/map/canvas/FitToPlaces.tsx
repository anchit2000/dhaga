"use client";

import { useEffect, useRef } from "react";
import { useMap, type MapBounds } from "@/components/ui/map";
import { MAP_FIT_MAX_ZOOM, MAP_FIT_PADDING } from "@/utils/constants/map";

/** Frames every place once, on first load. Deliberately one-shot: re-fitting
 *  after the user has panned would yank the camera out from under them. */
export function FitToPlaces({ bounds }: { bounds: MapBounds | null }): null {
  const { map, isLoaded } = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded || !bounds || hasFitted.current) return;
    hasFitted.current = true;
    map.fitBounds(bounds, {
      padding: MAP_FIT_PADDING,
      maxZoom: MAP_FIT_MAX_ZOOM,
      duration: 0,
    });
  }, [map, isLoaded, bounds]);

  return null;
}
