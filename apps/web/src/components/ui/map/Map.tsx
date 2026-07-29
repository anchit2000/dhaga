"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { cn } from "@/lib/utils";
import { MapContext, type MapTheme } from "./context";
import { useResolvedTheme } from "./use-resolved-theme";
import type { MapOptions } from "maplibre-gl";

export interface MapProps extends Omit<MapOptions, "container" | "style"> {
  /**
   * Basemap style URL per theme. REQUIRED on purpose — upstream mapcn defaults
   * to CARTO, whose commercial use needs an Enterprise licence (see
   * `utils/constants/map.ts`). Without a default there is nothing to fall back
   * into, so a CARTO basemap can only ever be shipped deliberately.
   */
  styles: { light: string; dark: string };
  children?: ReactNode;
  className?: string;
  /** Overrides the auto-detected app theme. */
  theme?: MapTheme;
  /** Shows the loading veil even after the map itself is ready. */
  loading?: boolean;
}

function MapLoader(): React.ReactElement {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/60 backdrop-blur-xs">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">Loading map</p>
    </div>
  );
}

/**
 * MapLibre canvas + context provider. Children (layers, controls) render only
 * once the instance exists and read `isLoaded` from `useMap()` before touching
 * the style.
 */
export function Map({
  styles,
  children,
  className,
  theme: themeProp,
  loading = false,
  ...options
}: MapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const currentStyleRef = useRef<string | null>(null);
  const resolvedTheme = useResolvedTheme(themeProp);
  const styleUrl = resolvedTheme === "dark" ? styles.dark : styles.light;

  // Construction options are read once, at mount; later changes are ignored
  // (re-creating the map would drop the camera and every layer).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    currentStyleRef.current = styleUrl;
    const map = new MapLibreMap({
      container,
      style: styleUrl,
      renderWorldCopies: false,
      ...optionsRef.current,
    });

    const handleLoad = (): void => setIsLoaded(true);
    const handleStyleLoad = (): void => setIsStyleLoaded(true);
    map.on("load", handleLoad);
    map.on("style.load", handleStyleLoad);
    setMapInstance(map);

    return () => {
      map.off("load", handleLoad);
      map.off("style.load", handleStyleLoad);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; the style swap below handles theme changes
  }, []);

  // Theme change: close the gate first so layer children tear their
  // sources/layers down, then swap on the next tick — by then React has
  // committed `isLoaded: false` and run their cleanups. `diff: false` forces a
  // full reload so `style.load` fires deterministically; a successful diff
  // never fires it, which would leave isStyleLoaded stuck false and the layers
  // gone for good.
  useEffect(() => {
    if (!mapInstance || currentStyleRef.current === styleUrl) return;
    currentStyleRef.current = styleUrl;
    setIsStyleLoaded(false);
    const swap = window.setTimeout(() => mapInstance.setStyle(styleUrl, { diff: false }), 0);
    return () => window.clearTimeout(swap);
  }, [mapInstance, styleUrl]);

  const contextValue = useMemo(
    () => ({ map: mapInstance, isLoaded: isLoaded && isStyleLoaded, resolvedTheme }),
    [mapInstance, isLoaded, isStyleLoaded, resolvedTheme],
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative h-full w-full", className)}>
        {!isLoaded || loading ? <MapLoader /> : null}
        {mapInstance ? children : null}
      </div>
    </MapContext.Provider>
  );
}
