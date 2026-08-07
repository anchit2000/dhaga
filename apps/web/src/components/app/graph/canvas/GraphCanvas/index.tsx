"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildCircleOptions } from "../../logic/circles";
import { buildRelationshipLabelMap } from "../../logic/style";
import { emptyRenderState } from "../reducers";
import { useFocusDeepLink, usePathRequest, type PathRequest } from "../use-deep-link";
import { useEdgePopover } from "../use-edge-popover";
import { useRenderer } from "../use-renderer";
import { useRenderSync } from "../use-render-sync";
import { useSpokeSelect, useTagLayer } from "../use-tag-layer";
import { useViewState } from "../use-view-state";
import { GraphCanvasView } from "./GraphCanvasView";
import { useE2eGraphExpose } from "./use-e2e-expose";
import type { GraphIndexes } from "../../logic/indexes";
import type { FullGraphPayload, PositionMap } from "../../types";

export type { PathRequest };

export function GraphCanvas({
  payload,
  indexes,
  positions,
  focusId,
  pathRequest,
  onGraphChanged,
}: {
  payload: FullGraphPayload;
  indexes: GraphIndexes;
  positions: PositionMap;
  focusId: string | null;
  pathRequest: PathRequest | null;
  onGraphChanged: () => void;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderStateRef = useRef(emptyRenderState());
  const view = useViewState();

  const labelMap = useMemo(
    () => buildRelationshipLabelMap(payload.relationshipTypes),
    [payload.relationshipTypes],
  );
  const { popover, closePopover, onEdgeClick, setPopoverEdges } = useEdgePopover(indexes, labelMap);
  const { select, exitIsolate, setHighlightedPath } = view;
  // Selection routes through the spoke loader: on a truncated tag graph a
  // hub's members merge first, select after (see useSpokeSelect).
  const { selectNode, ensureSpokesRef } = useSpokeSelect(select);

  const renderer = useRenderer(containerRef, payload, indexes, positions, renderStateRef, {
    onNodeClick: (nodeId) => {
      closePopover();
      selectNode(nodeId);
    },
    onNodeDoubleClick: (nodeId) => {
      const kind = indexes.nodeById.get(nodeId)?.kind;
      if (kind === "company" || kind === "event") view.toggleCollapsed(nodeId);
    },
    onStageClick: () => {
      closePopover();
      exitIsolate();
    },
    onEdgeClick,
  });

  // Nodes/edges/indexes views that grow as the lazy tag layer merges in; the
  // popover's edge map and the spoke loader land after the renderer exists.
  const tags = useTagLayer(renderer, payload, indexes, positions, labelMap, !view.hiddenLayers.has("tag"));
  useEffect(() => {
    setPopoverEdges(tags.edges);
    ensureSpokesRef.current = tags.ensureTagSpokes;
  }, [setPopoverEdges, tags.edges, ensureSpokesRef, tags.ensureTagSpokes]);
  const circles = useMemo(() => buildCircleOptions(tags.nodes, tags.indexes), [tags.nodes, tags.indexes]);

  const hiddenNodes = useRenderSync(renderer, tags.indexes, view, renderStateRef);
  useFocusDeepLink(renderer, focusId, tags.indexes, selectNode);
  usePathRequest(renderer, pathRequest, tags.indexes, setHighlightedPath);

  useE2eGraphExpose(renderer);

  const selectedNode = view.selectedId ? (tags.indexes.nodeById.get(view.selectedId) ?? null) : null;
  const showReset = view.isolateRootId !== null || view.highlightedPath !== null;

  return (
    <GraphCanvasView
      containerRef={containerRef}
      payload={payload}
      view={view}
      renderer={renderer}
      tags={tags}
      circles={circles}
      hiddenNodes={hiddenNodes}
      popover={popover}
      closePopover={closePopover}
      selectNode={selectNode}
      selectedNode={selectedNode}
      labelMap={labelMap}
      showReset={showReset}
      exitIsolate={exitIsolate}
      onGraphChanged={onGraphChanged}
    />
  );
}
