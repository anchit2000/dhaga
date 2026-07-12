"use client";

import { useMemo, useReducer } from "react";
import { toast } from "sonner";
import {
  Background,
  Controls,
  ReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GRAPH_EDGE_CONTEXT_CONTACT_CAP,
  GRAPH_MAX_ZOOM,
  GRAPH_MIN_ZOOM,
} from "@/utils/constants/graph";
import { CompanyGraphNode, OverflowGraphNode, PersonGraphNode, type BrowserFlowNode } from "./nodes";
import { DimensionToggle } from "./DimensionToggle";
import { DirectionIndicators } from "./DirectionIndicators";
import { buildFlow } from "./layout";
import { graphReducer, initialGraphState } from "./graph-state";
import { useViewportNavigation } from "./useViewportNavigation";
import type { Cluster, ClusterDimension, GraphViewEdge, GraphViewNode } from "@/lib/repo/graph-data";

const nodeTypes = { person: PersonGraphNode, company: CompanyGraphNode, overflow: OverflowGraphNode };

interface ClusterMembersResponse {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  totalCount: number;
  truncated: boolean;
}

export function GraphBrowser({ initialClusters }: { initialClusters: Cluster[] }) {
  const [state, dispatch] = useReducer(graphReducer, initialClusters, initialGraphState);
  const {
    setContainer,
    result: viewportResult,
    initialize,
    focus,
    navigate,
    syncBounds,
  } = useViewportNavigation(state.clusters);

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

  const { nodes, edges } = useMemo(
    () => buildFlow(viewportResult.visibleClusters, state.expanded, state.loaded, state.pending, viewportResult.positions),
    [viewportResult, state.expanded, state.loaded, state.pending],
  );

  const onNodeClick: NodeMouseHandler<BrowserFlowNode> = (_event, node) => {
    if (node.type !== "company") return;
    focus(node.position);
    void expandCluster(node.id);
  };

  return (
    <div className="space-y-3">
      <DimensionToggle value={state.dimension} onChange={switchDimension} />
      <div ref={setContainer} className="relative h-[70vh] overflow-hidden rounded-2xl border border-seam bg-panel/40">
        {state.clustersLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-fog">Loading…</div>
        ) : (
          <ReactFlow
            key={state.dimension}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onInit={(instance) => void initialize(instance)}
            onMoveEnd={(_event, nextViewport) => syncBounds(nextViewport)}
            minZoom={GRAPH_MIN_ZOOM}
            maxZoom={GRAPH_MAX_ZOOM}
            panOnScroll
            zoomOnDoubleClick
            onlyRenderVisibleElements
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            nodesDraggable={false}
            deleteKeyCode={null}
          >
            <Background color="#2b241b" gap={28} />
            <Controls showFitView={false} showInteractive={false} />
            <DirectionIndicators counts={viewportResult.directions} onNavigate={(direction) => void navigate(direction)} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
