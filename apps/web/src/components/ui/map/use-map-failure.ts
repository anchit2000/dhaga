"use client";

import { useEffect, useState } from "react";
import { MAP_LOAD_TIMEOUT_MS } from "@/utils/constants/map";
import type { Map as MapLibreMap } from "maplibre-gl";

/** Shown when MapLibre reported a failure before the map ever became usable. */
const MAP_FAILED_MESSAGE = "The map couldn't start. Reload the page to try again.";
/** Shown when nothing was reported at all and the clock ran out. */
const MAP_TIMEOUT_MESSAGE =
  "The map is taking longer than expected and may not be reachable. Reload the page to try again.";

/**
 * Turns "the map never finished loading" from a permanent spinner into a state
 * the UI can render.
 *
 * WHY THIS EXISTS — MapLibre signals success by FIRING `load`. There is no
 * corresponding "failed" signal for the failures that matter most, so from
 * React every one of them is indistinguishable from still loading, and the
 * loading veil stays up forever with nothing in the UI to say why. That is not
 * hypothetical: a worker URL that resolved to a 404 shipped exactly this
 * symptom once (see MAPLIBRE_WORKER_URL), and it was diagnosed from the
 * network tab because the product itself said nothing.
 *
 * Two detectors, because neither covers the other:
 *  - the `error` event catches what MapLibre DOES report (style fetch failed,
 *    WebGL context refused, worker rejected);
 *  - the timeout catches what it reports nothing for — a request that simply
 *    never settles.
 *
 * Both are armed only while the map has yet to load, and disarmed the instant
 * it does. That is deliberate: MapLibre keeps emitting `error` for a single
 * missing tile or glyph long after the map is perfectly usable, and blanking a
 * working map over one absent tile would be a worse bug than the silence. For
 * the same reason the verdict is READ THROUGH `isLoaded` rather than stored as
 * final — a map that loads at 25 seconds is slow, not broken, and must clear
 * the timeout's verdict on arrival.
 */
export function useMapFailure(map: MapLibreMap | null, isLoaded: boolean): string | null {
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!map || isLoaded) return;

    const handleError = (event: { error?: unknown }): void => {
      // MapLibre console.errors errors only while NOTHING listens; subscribing
      // makes the diagnostic ours to keep. Safe to log: this is library and
      // network state, never contact data.
      console.error("[map] MapLibre failed before load", event.error);
      setFailure(MAP_FAILED_MESSAGE);
    };
    map.on("error", handleError);

    const timer = window.setTimeout(() => setFailure(MAP_TIMEOUT_MESSAGE), MAP_LOAD_TIMEOUT_MS);

    return () => {
      map.off("error", handleError);
      window.clearTimeout(timer);
    };
  }, [map, isLoaded]);

  return isLoaded ? null : failure;
}
