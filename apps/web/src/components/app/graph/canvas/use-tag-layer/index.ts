"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTagLayerFetch } from "./fetch";
import { useTagSpokes } from "./spokes";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { GraphIndexes } from "../../logic/indexes";
import type { MergedTagLayer } from "../../logic/tag-layer";
import type { GraphRenderer } from "../create-sigma";
import type {
  FullGraphEdge,
  FullGraphNode,
  FullGraphPayload,
  PositionMap,
} from "../../types";

// Directory split per the 150-line rule; import paths unchanged.
export { useSpokeSelect, type SpokeSelectApi } from "./select";

export interface TagLayerApi {
  /** The payload's nodes/edges, plus the tag layer as it merges in. */
  nodes: readonly FullGraphNode[];
  edges: readonly FullGraphEdge[];
  /** Same maps as the input indexes (extended in place by the merges), re-wrapped
   *  with a fresh identity so memo consumers recompute when late nodes arrive. */
  indexes: GraphIndexes;
  tagsLoading: boolean;
  tagsReady: boolean;
  /** True when the server withheld spokes (pair count over the edge budget). */
  tagsTruncated: boolean;
  /** True when the server capped the hub list itself (GRAPH_TAG_HUB_CAP). */
  tagsHubsTruncated: boolean;
  /** Floor-surviving hub total server-side — the "of N" in the panel notice. */
  tagsTotalHubs: number;
  /** Resolves once nodeId's spokes are merged — callers select afterwards so
   *  isolate and camera fit see the members (see useTagSpokes). */
  ensureTagSpokes: (nodeId: string) => Promise<void>;
}

/**
 * Lazy tag layer. Tag hubs + tagged edges are the graph's one unbounded
 * pair-multiplier (contacts × tags), so /api/graph/full omits them; this hook
 * fetches /api/graph/tags the first time the Tags layer is enabled and merges
 * into the live graphology instance — no sigma rebuild, no re-layout, existing
 * nodes never move. Over the edge budget only hubs merge (sized by their
 * aggregate memberCount); each tag's spokes then load on selection, cached per
 * tag and hard-capped client-side. Merges persist for the payload's lifetime:
 * disabling the layer hides it through the normal visibility sweep,
 * re-enabling is instant. A failed load resets so the next enable retries.
 */
export function useTagLayer(
  renderer: GraphRenderer | null,
  payload: FullGraphPayload,
  indexes: GraphIndexes,
  positions: PositionMap,
  labelMap: RelationshipLabelMap,
  tagsEnabled: boolean,
): TagLayerApi {
  const [merged, setMerged] = useState<MergedTagLayer>({ nodes: [], edges: [] });
  // aliveRef is re-armed by every effect run, so it goes false-for-good only
  // on real unmount — a late resolve must not merge into a killed renderer.
  const aliveRef = useRef(true);

  const onMerged = useCallback((result: MergedTagLayer) => {
    setMerged((prev) => ({
      nodes: [...prev.nodes, ...result.nodes],
      edges: [...prev.edges, ...result.edges],
    }));
  }, []);
  const { applyMerge, registerHubs, ensureTagSpokes } = useTagSpokes(
    renderer,
    indexes,
    positions,
    labelMap,
    aliveRef,
    onMerged,
  );

  const { status, bounds } = useTagLayerFetch(renderer, tagsEnabled, applyMerge, registerHubs, aliveRef);

  const grown = merged.nodes.length > 0 || merged.edges.length > 0;
  const nodes = useMemo(
    () => (grown ? [...payload.nodes, ...merged.nodes] : payload.nodes),
    [payload.nodes, grown, merged.nodes],
  );
  const edges = useMemo(
    () => (grown ? [...payload.edges, ...merged.edges] : payload.edges),
    [payload.edges, grown, merged.edges],
  );
  // Depends on the merged OBJECT, not the boolean: every merge (including a
  // later per-tag spoke load) must re-wrap identity so consumers recompute.
  const liveIndexes = useMemo(
    () => (merged.nodes.length > 0 || merged.edges.length > 0 ? { ...indexes } : indexes),
    [indexes, merged],
  );

  return {
    nodes,
    edges,
    indexes: liveIndexes,
    tagsLoading: status === "loading",
    tagsReady: status === "ready",
    tagsTruncated: bounds.spokesTruncated,
    tagsHubsTruncated: bounds.hubsTruncated,
    tagsTotalHubs: bounds.totalHubs,
    ensureTagSpokes,
  };
}
