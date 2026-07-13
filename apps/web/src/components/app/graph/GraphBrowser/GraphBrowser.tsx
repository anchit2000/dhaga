"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GRAPH_MAX_ZOOM, GRAPH_MIN_ZOOM } from "@/utils/constants/graph";
import { CompanyGraphNode, OverflowGraphNode, PersonGraphNode, type BrowserFlowNode } from "../nodes";
import { DimensionToggle } from "../DimensionToggle";
import { DirectionIndicators } from "../DirectionIndicators";
import { buildFlow } from "../layout";
import { useViewportNavigation } from "../useViewportNavigation";
import type { Cluster } from "@/lib/repo/graph-data";
import { useGraphData } from "./useGraphData";
import { useGraphFocus, type FocusTarget } from "./useGraphFocus";

const nodeTypes = { person: PersonGraphNode, company: CompanyGraphNode, overflow: OverflowGraphNode };

export function GraphBrowser({
  initialClusters,
  focusTarget = null,
  focusMissing = false,
}: {
  initialClusters: Cluster[];
  focusTarget?: FocusTarget | null;
  focusMissing?: boolean;
}) {
  const { state, switchDimension, expandCluster } = useGraphData(initialClusters);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const {
    setContainer,
    result: viewportResult,
    initialize,
    focus,
    navigate,
    syncBounds,
  } = useViewportNavigation(state.clusters);

  const { nodes, edges } = useMemo(
    () =>
      buildFlow(
        viewportResult.visibleClusters,
        state.expanded,
        state.loaded,
        state.pending,
        viewportResult.positions,
        focusedId,
      ),
    [viewportResult, state.expanded, state.loaded, state.pending, focusedId],
  );

  const { kickoff, clearFocus } = useGraphFocus({
    focusTarget,
    focusMissing,
    nodes,
    loaded: state.loaded,
    positions: viewportResult.positions,
    focus,
    expandCluster,
    setFocusedId,
  });

  const onNodeClick: NodeMouseHandler<BrowserFlowNode> = (_event, node) => {
    if (node.type !== "company") return;
    clearFocus();
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
            onPaneClick={clearFocus}
            onInit={(instance) => {
              void initialize(instance).then(kickoff);
            }}
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
