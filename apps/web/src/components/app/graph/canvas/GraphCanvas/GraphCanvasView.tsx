"use client";

import { resetCamera } from "../camera";
import { CirclesUnderlay } from "../CirclesUnderlay";
import { EdgePopover, type EdgePopoverData } from "../../panels/EdgePopover";
import { GraphControls } from "../../panels/GraphControls";
import { GraphSearch } from "../../panels/GraphSearch";
import { LayersPanel } from "../../panels/LayersPanel";
import { NodePanel } from "../../panels/NodePanel";
import { ResetChip } from "../../panels/ResetChip";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { RefObject } from "react";
import type { GraphRenderer } from "../create-sigma";
import type { TagLayerApi } from "../use-tag-layer";
import type { GraphViewStateApi } from "../use-view-state";
import type { CircleOption } from "../../logic/circles";
import type { FullGraphNode, FullGraphPayload } from "../../types";

/**
 * Pure presentation for GraphCanvas — split from index.tsx to keep the
 * component under the 150-line rule. Every prop is either a value computed by
 * the container's hooks or a callback that closes over that hook state.
 */
export function GraphCanvasView({
  containerRef,
  payload,
  view,
  renderer,
  tags,
  circles,
  hiddenNodes,
  popover,
  closePopover,
  selectNode,
  selectedNode,
  labelMap,
  showReset,
  exitIsolate,
  onGraphChanged,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  payload: FullGraphPayload;
  view: GraphViewStateApi;
  renderer: GraphRenderer | null;
  tags: TagLayerApi;
  circles: readonly CircleOption[];
  hiddenNodes: ReadonlySet<string>;
  popover: EdgePopoverData | null;
  closePopover: () => void;
  selectNode: (nodeId: string | null) => void;
  selectedNode: FullGraphNode | null;
  labelMap: RelationshipLabelMap;
  showReset: boolean;
  exitIsolate: () => void;
  onGraphChanged: () => void;
}): React.ReactElement {
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

      {renderer ? (
        <GraphControls
          renderer={renderer}
          visibleNodeIds={() => renderer.getGraph().filterNodes((id) => !hiddenNodes.has(id))}
        />
      ) : null}

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
