"use client";

import { useEffect, useState } from "react";
import { MAP_POLL_INTERVAL_MS, MAP_POLL_MAX_ATTEMPTS } from "@/utils/constants/map";
import { fetchMapPayload } from "./logic/map-fetch";
import type { MapPayload } from "@/types";

/** Mirrors the graph's phase machine. `empty` still carries the payload: the
 *  empty state has to say how many contacts were left off and why — and
 *  whether they are merely still being geocoded — so it must not throw the
 *  counts away. */
export type MapPhase =
  | { stage: "fetching" }
  | { stage: "empty"; payload: MapPayload }
  | { stage: "error"; message: string }
  | { stage: "ready"; payload: MapPayload };

function toPhase(payload: MapPayload): MapPhase {
  return payload.places.length === 0
    ? { stage: "empty", payload }
    : { stage: "ready", payload };
}

/**
 * One full-payload load, then a bounded poll while the server still has places
 * to geocode.
 *
 * Polling is not a nicety: GET /api/map never geocodes inline (1 req/sec by
 * provider ToS), so a first-ever load answers `places: []` with a non-zero
 * `pendingCount` and the map only fills in on later fetches. Every fetch after
 * the first is conditional; a 304 means "nothing has landed yet", which keeps
 * the current payload AND the schedule — it is neither an error nor an empty
 * map. Polling pauses while the tab is hidden and stops at an attempt ceiling
 * so a place the provider can never resolve cannot spin forever.
 */
export function useMapData(): MapPhase {
  const [phase, setPhase] = useState<MapPhase>({ stage: "fetching" });

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;
    let etag: string | null = null;
    let attempts = 0;
    // Last payload actually seen — the source of truth for "still pending?",
    // since a 304 leaves `phase` untouched.
    let current: MapPayload | null = null;

    const schedule = (): void => {
      if (disposed || timer !== null) return;
      if (attempts >= MAP_POLL_MAX_ATTEMPTS) return;
      if (document.visibilityState === "hidden") return; // resumes on visibilitychange
      attempts += 1;
      timer = window.setTimeout(() => {
        timer = null;
        void load();
      }, MAP_POLL_INTERVAL_MS);
    };

    const load = async (): Promise<void> => {
      try {
        const result = await fetchMapPayload(etag);
        if (disposed) return;
        if (result !== "unchanged") {
          etag = result.etag;
          current = result.payload;
          setPhase(toPhase(result.payload));
        }
        if ((current?.pendingCount ?? 0) > 0) schedule();
      } catch (error: unknown) {
        if (disposed) return;
        // A failed POLL must not tear down a map that is already on screen —
        // it just ends the polling. Only a failed FIRST load is an error state.
        if (current) return;
        setPhase({
          stage: "error",
          message: error instanceof Error ? error.message : "Something went wrong",
        });
      }
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === "hidden") {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        return;
      }
      if ((current?.pendingCount ?? 0) > 0) schedule();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    void load();

    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return phase;
}
