"use client";

import { createContext, useContext } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

export type MapTheme = "light" | "dark";

export interface MapContextValue {
  map: MapLibreMap | null;
  /** True once BOTH the map and its style have loaded — layer children must
   *  wait for this or `addSource`/`addLayer` throws. */
  isLoaded: boolean;
  resolvedTheme: MapTheme;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMap(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}
