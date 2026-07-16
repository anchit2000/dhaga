"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { buildGraphIndexes, type GraphIndexes } from "./logic/indexes";
import { fetchGraph, toCacheEntry } from "./logic/graph-fetch";
import {
  graphCountsChanged,
  loadPayloadCache,
  savePayloadCache,
  type CachedGraphPayload,
} from "./logic/payload-cache";
import { reportGraphLoad } from "./logic/perf-beacon";
import { runLayout } from "./layout/run-layout";
import type { LayoutSource } from "./logic/layout-precedence";
import type { FullGraphPayload, PositionMap } from "./types";

export type GraphPhase =
  | { stage: "fetching" }
  | { stage: "layout"; progress: number }
  | { stage: "empty" }
  | { stage: "error"; message: string }
  | { stage: "ready"; payload: FullGraphPayload; indexes: GraphIndexes; positions: PositionMap };

/**
 * Payload boot with stale-while-revalidate: render the IndexedDB copy
 * immediately (source "idb"), revalidate with If-None-Match in the
 * background — 304 means done, 200 swaps the fresh payload in silently
 * (camera and selection survive; see use-renderer/GraphCanvas). Cache
 * misses and user-triggered refetches go straight to the network.
 */
export function useGraphData(): { phase: GraphPhase; refetch: () => void } {
  const [phase, setPhase] = useState<GraphPhase>({ stage: "fetching" });
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let disposed = false;
    let cancelLayout: (() => void) | null = null;
    const startedAt = performance.now();

    // Layout + phase swap. Silent mode keeps the current canvas interactive
    // while the fresher payload lays out, then swaps with no loading flash.
    const settle = async (
      payload: FullGraphPayload,
      silent: boolean,
    ): Promise<{ layoutMs: number; layoutSource: LayoutSource } | null> => {
      if (payload.nodes.length === 0) {
        setPhase({ stage: "empty" });
        return null;
      }
      const indexes = buildGraphIndexes(payload);
      if (!silent) setPhase({ stage: "layout", progress: 0 });
      const run = runLayout(payload, indexes, (share) => {
        if (!disposed && !silent) setPhase({ stage: "layout", progress: share });
      });
      cancelLayout = run.cancel;
      const layoutStart = performance.now();
      const { positions, source } = await run.result;
      if (disposed) return null;
      setPhase({ stage: "ready", payload, indexes, positions });
      return { layoutMs: performance.now() - layoutStart, layoutSource: source };
    };

    const revalidate = async (cached: CachedGraphPayload): Promise<void> => {
      try {
        const fetched = await fetchGraph(cached.etag);
        if (fetched === "unchanged" || disposed) return;
        const entry = toCacheEntry(fetched);
        if (entry) void savePayloadCache(entry);
        const changed = graphCountsChanged(cached.payload, fetched.payload);
        const settled = await settle(fetched.payload, true);
        if (settled && changed) toast("Graph updated");
      } catch {
        // Stale render stands; the next visit revalidates again.
      }
    };

    const boot = async (): Promise<void> => {
      // After a graph edit (refetch) the IDB copy is known-stale — skip it.
      const cached = reloadNonce === 0 ? await loadPayloadCache() : null;
      if (disposed) return;
      if (cached) {
        const fetchMs = performance.now() - startedAt;
        const settled = await settle(cached.payload, false);
        if (settled) {
          reportGraphLoad({
            nodes: cached.payload.nodes.length,
            edges: cached.payload.edges.length,
            payloadBytes: cached.payloadBytes,
            fetchMs,
            ...settled,
            ttiMs: performance.now() - startedAt,
            source: "idb",
          });
        }
        void revalidate(cached);
        return;
      }
      const fetchStart = performance.now();
      const fetched = await fetchGraph(null);
      // fetchMs is fetch+parse ONLY, captured before settle() — layout time
      // is layoutMs, and ttiMs stays the wall-clock total. (Measuring after
      // settle() made fetchMs ≈ ttiMs on cold loads: 16.8s reported for a
      // ~1s real fetch.)
      const fetchMs = performance.now() - fetchStart;
      if (fetched === "unchanged" || disposed) return; // 304 impossible without a validator
      const entry = toCacheEntry(fetched);
      if (entry) void savePayloadCache(entry);
      const settled = await settle(fetched.payload, false);
      if (settled) {
        reportGraphLoad({
          nodes: fetched.payload.nodes.length,
          edges: fetched.payload.edges.length,
          payloadBytes: fetched.bytes,
          fetchMs,
          ...settled,
          ttiMs: performance.now() - startedAt,
          source: "network",
        });
      }
    };

    void boot().catch((error: unknown) => {
      if (!disposed) {
        setPhase({
          stage: "error",
          message: error instanceof Error ? error.message : "Something went wrong",
        });
      }
    });

    return () => {
      disposed = true;
      cancelLayout?.();
    };
  }, [reloadNonce]);

  const refetch = useCallback(() => {
    setPhase({ stage: "fetching" }); // reset happens in the event, not the effect
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  return { phase, refetch };
}
