"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { mergeTagLayer, type MergedTagLayer } from "../../logic/tag-layer";
import { spokeLoadAllowed } from "../../logic/tag-spokes";
import { resolveGraphTheme } from "../theme";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { GraphIndexes } from "../../logic/indexes";
import type { GraphRenderer } from "../create-sigma";
import type {
  PositionMap,
  TagLayerHub,
  TagLayerPayload,
  TagSpokesPayload,
} from "../../types";

export interface TagSpokesApi {
  /** Merge any tag payload into the live graph, tracking the edge total. */
  applyMerge: (layer: Pick<TagLayerPayload, "hubs" | "edges">, live: GraphRenderer) => void;
  /** Record a truncated payload's hub aggregates for selection-time loads. */
  registerHubs: (hubs: readonly TagLayerHub[]) => void;
  /** Resolves once nodeId's spokes are merged — immediate no-op for non-tag
   *  ids, under-budget graphs, cached tags and budget-refused loads. */
  ensureTagSpokes: (nodeId: string) => Promise<void>;
}

/**
 * The per-tag (click-to-load) half of the lazy tag layer: hub aggregates
 * registered from a truncated payload, the session cache of per-tag fetches
 * (kept promises — one fetch per slug, in-flight or done), and the running
 * merged-edge total that spokeLoadAllowed hard-caps. A failed fetch drops out
 * of the cache so the next selection retries.
 */
export function useTagSpokes(
  renderer: GraphRenderer | null,
  indexes: GraphIndexes,
  positions: PositionMap,
  labelMap: RelationshipLabelMap,
  aliveRef: React.RefObject<boolean>,
  onMerged: (result: MergedTagLayer) => void,
): TagSpokesApi {
  const hubsRef = useRef(new Map<string, TagLayerHub>());
  const fetchesRef = useRef(new Map<string, Promise<void>>());
  const mergedCountRef = useRef(0);

  const applyMerge = useCallback(
    (layer: Pick<TagLayerPayload, "hubs" | "edges">, live: GraphRenderer) => {
      const theme = resolveGraphTheme(live.getContainer());
      const result = mergeTagLayer(layer, indexes, live.getGraph(), positions, labelMap, theme);
      mergedCountRef.current += result.edges.length;
      if (result.nodes.length > 0 || result.edges.length > 0) onMerged(result);
    },
    [indexes, positions, labelMap, onMerged],
  );

  const registerHubs = useCallback((hubs: readonly TagLayerHub[]) => {
    for (const hub of hubs) hubsRef.current.set(hub.id, hub);
  }, []);

  const ensureTagSpokes = useCallback(
    (nodeId: string): Promise<void> => {
      const hub = hubsRef.current.get(nodeId); // only truncated graphs register hubs
      if (!hub || !renderer) return Promise.resolve();
      const cached = fetchesRef.current.get(hub.slug);
      if (cached) return cached;
      if (!spokeLoadAllowed(mergedCountRef.current, hub.memberCount)) {
        toast.error(
          `Tag edge limit reached — loading "${hub.label}" would make the graph unresponsive.`,
        );
        return Promise.resolve();
      }
      const load = fetch(`/api/graph/tags?tag=${encodeURIComponent(hub.slug)}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Tag spokes request failed (${res.status})`);
          const spokes = (await res.json()) as TagSpokesPayload;
          if (!aliveRef.current) return;
          applyMerge({ hubs: [spokes.hub], edges: spokes.edges }, renderer);
        })
        .catch(() => {
          fetchesRef.current.delete(hub.slug); // the next selection retries
          if (aliveRef.current) toast.error(`Couldn't load people tagged "${hub.label}".`);
        });
      fetchesRef.current.set(hub.slug, load);
      return load;
    },
    [renderer, aliveRef, applyMerge],
  );

  return { applyMerge, registerHubs, ensureTagSpokes };
}
