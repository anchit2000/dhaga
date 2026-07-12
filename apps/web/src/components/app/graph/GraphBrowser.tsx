"use client";

import { useMemo, useReducer, useRef } from "react";
import { toast } from "sonner";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GRAPH_CAMERA_DURATION_MS,
  GRAPH_EDGE_CONTEXT_CONTACT_CAP,
  GRAPH_FOCUS_ZOOM,
  GRAPH_INITIAL_ZOOM,
  GRAPH_MAX_ZOOM,
  GRAPH_MIN_ZOOM,
} from "@/utils/constants/graph";
import { CompanyGraphNode, OverflowGraphNode, PersonGraphNode, type BrowserFlowNode } from "./nodes";
import { DimensionToggle } from "./DimensionToggle";
import { buildFlow } from "./layout";
import { graphReducer, initialGraphState } from "./graph-state";
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
  const flowRef = useRef<ReactFlowInstance<BrowserFlowNode, Edge> | null>(null);

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
    const loadedIds = [...state.expanded]
      .flatMap((clusterKey) => state.loaded.get(clusterKey)?.contacts ?? [])
      .map((contact) => contact.id)
      .slice(-GRAPH_EDGE_CONTEXT_CONTACT_CAP);
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
    () => buildFlow(state.clusters, state.expanded, state.loaded, state.pending),
    [state.clusters, state.expanded, state.loaded, state.pending],
  );

  const onNodeClick: NodeMouseHandler<BrowserFlowNode> = (_event, node) => {
    if (node.type !== "company") return;
    void flowRef.current?.setCenter(node.position.x, node.position.y, {
      zoom: GRAPH_FOCUS_ZOOM,
      duration: GRAPH_CAMERA_DURATION_MS,
    });
    void expandCluster(node.id);
  };

  return (
    <div className="space-y-3">
      <DimensionToggle value={state.dimension} onChange={switchDimension} />
      <div className="h-[70vh] overflow-hidden rounded-2xl border border-seam bg-panel/40">
        {state.clustersLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-fog">Loading…</div>
        ) : (
          <ReactFlow
            key={state.dimension}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onInit={(instance) => {
              flowRef.current = instance;
              const home = nodes[0];
              if (home) {
                void instance.setCenter(home.position.x, home.position.y, {
                  zoom: GRAPH_INITIAL_ZOOM,
                });
              }
            }}
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
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
