"use client";

import { useReducer } from "react";
import { toast } from "sonner";
import { GRAPH_EDGE_CONTEXT_CONTACT_CAP } from "@/utils/constants/graph";
import { graphReducer, initialGraphState } from "../graph-state";
import type { Cluster, ClusterDimension, GraphViewEdge, GraphViewNode } from "@/lib/repo/graph-data";

interface ClusterMembersResponse {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  totalCount: number;
  truncated: boolean;
}

/** Owns cluster/expansion state plus the network calls that populate it — the
 *  same concern the reducer already models, just with the fetch glue attached. */
export function useGraphData(initialClusters: Cluster[]) {
  const [state, dispatch] = useReducer(graphReducer, initialClusters, initialGraphState);

  async function switchDimension(dimension: ClusterDimension): Promise<void> {
    if (dimension === state.dimension || state.clustersLoading) return;
    dispatch({ type: "dimension-start", dimension });
    try {
      const res = await fetch(`/api/graph/clusters?dimension=${dimension}`);
      if (!res.ok) throw new Error();
      const data: { clusters: Cluster[] } = await res.json();
      dispatch({ type: "dimension-success", dimension, clusters: data.clusters });
    } catch {
      toast.error("Couldn't load that view — try again.");
      dispatch({ type: "dimension-success", dimension, clusters: [] });
    }
  }

  async function loadFocusRelationships(contactId: string): Promise<void> {
    try {
      const res = await fetch(
        `/api/graph/relationships?contactId=${encodeURIComponent(contactId)}`,
      );
      if (!res.ok) return;
      const data: { nodes: GraphViewNode[]; edges: GraphViewEdge[] } = await res.json();
      dispatch({ type: "focus-relationships", relationships: data });
    } catch {
      // Non-fatal: the interpersonal overlay just won't draw.
    }
  }

  async function expandCluster(key: string): Promise<void> {
    if (state.expanded.has(key)) {
      dispatch({ type: "collapse", key });
      return;
    }
    const cached = state.loaded.get(key);
    if (cached) {
      dispatch({ type: "expand-success", key, entry: cached });
      return;
    }
    dispatch({ type: "expand-start", key });
    const expandedKeys = [...state.expanded].slice(-GRAPH_EDGE_CONTEXT_CONTACT_CAP);
    const contactLimit = GRAPH_EDGE_CONTEXT_CONTACT_CAP - expandedKeys.length;
    const contactIds = contactLimit > 0
      ? expandedKeys
          .flatMap((clusterKey) => state.loaded.get(clusterKey)?.contacts ?? [])
          .map((contact) => contact.id)
          .slice(-contactLimit)
      : [];
    const loadedIds = [...expandedKeys, ...contactIds];
    try {
      const params = new URLSearchParams({ dimension: state.dimension, key });
      if (loadedIds.length > 0) params.set("loaded", loadedIds.join(","));
      const res = await fetch(`/api/graph/cluster-members?${params}`);
      if (!res.ok) throw new Error();
      const data: ClusterMembersResponse = await res.json();
      dispatch({
        type: "expand-success",
        key,
        entry: {
          contacts: data.nodes,
          edges: data.edges,
          overflowCount: data.truncated ? data.totalCount - data.nodes.length : 0,
        },
      });
    } catch {
      toast.error("Couldn't load that group — try again.");
      dispatch({ type: "expand-error", key });
    }
  }

  return { state, switchDimension, expandCluster, loadFocusRelationships };
}
