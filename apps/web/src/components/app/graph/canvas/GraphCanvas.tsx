"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildCircleOptions } from "../logic/circles";
import { buildRelationshipLabelMap } from "../logic/style";
import { resetCamera } from "./camera";
import { emptyRenderState } from "./reducers";
import { useFocusDeepLink, usePathRequest, type PathRequest } from "./use-deep-link";
import { useEdgePopover } from "./use-edge-popover";
import { useRenderer } from "./use-renderer";
import { useRenderSync } from "./use-render-sync";
import { useSpokeSelect, useTagLayer } from "./use-tag-layer";
import { useViewState } from "./use-view-state";
import { CirclesUnderlay } from "./CirclesUnderlay";
import { EdgePopover } from "../panels/EdgePopover";
import { GraphSearch } from "../panels/GraphSearch";
import { LayersPanel } from "../panels/LayersPanel";
import { NodePanel } from "../panels/NodePanel";
import { ResetChip } from "../panels/ResetChip";
import type { GraphIndexes } from "../logic/indexes";
import type { FullGraphPayload, PositionMap } from "../types";

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

  const selectedNode = view.selectedId ? (tags.indexes.nodeById.get(view.selectedId) ?? null) : null;
  const showReset = view.isolateRootId !== null || view.highlightedPath !== null;

  return (
    <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-seam bg-ink">
      {renderer && view.circleIds.size > 0 ? (
        <CirclesUnderlay
          renderer={renderer}
          indexes={tags.indexes}
          circleIds={view.circleIds}
          hiddenNodes={hiddenNodes}
        />
      ) : null}
      <div ref={containerRef} className="absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
        <LayersPanel
          nodeTypes={payload.nodeTypes}
          hiddenLayers={view.hiddenLayers}
          onToggleLayer={view.toggleLayer}
          circles={circles}
          circleIds={view.circleIds}
          onToggleCircle={view.toggleCircle}
          tagsLoading={tags.tagsLoading}
          tagsReady={tags.tagsReady}
          tagsTruncated={tags.tagsTruncated}
          tagsHubsTruncated={tags.tagsHubsTruncated}
          tagsTotalHubs={tags.tagsTotalHubs}
        />
        <GraphSearch nodes={tags.nodes} nodeTypes={payload.nodeTypes} onPick={selectNode} />
      </div>

      {showReset ? (
        <ResetChip
          onReset={() => {
            exitIsolate();
            if (renderer) resetCamera(renderer);
          }}
        />
      ) : null}
      {popover ? (
        <EdgePopover
          data={popover}
          onGoTo={(nodeId) => {
            closePopover();
            selectNode(nodeId);
          }}
          onClose={closePopover}
        />
      ) : null}

      <NodePanel
        node={selectedNode}
        indexes={tags.indexes}
        nodeTypes={payload.nodeTypes}
        labelMap={labelMap}
        collapsedGroups={view.collapsedGroups}
        circleIds={view.circleIds}
        onClose={view.closePanel}
        onGoTo={selectNode}
        onToggleCollapsed={view.toggleCollapsed}
        onToggleCircle={view.toggleCircle}
        onGraphChanged={onGraphChanged}
      />
    </div>
  );
}
