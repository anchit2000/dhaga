"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { resetCamera } from "@/components/app/graph/canvas/camera";
import { CirclesUnderlay } from "@/components/app/graph/canvas/CirclesUnderlay";
import { emptyRenderState } from "@/components/app/graph/canvas/reducers";
import { useRenderer } from "@/components/app/graph/canvas/use-renderer";
import { useRenderSync } from "@/components/app/graph/canvas/use-render-sync";
import { useViewState } from "@/components/app/graph/canvas/use-view-state";
import { buildCircleOptions } from "@/components/app/graph/logic/circles";
import { GraphControls } from "@/components/app/graph/panels/GraphControls";
import { GraphSearch } from "@/components/app/graph/panels/GraphSearch";
import { ResetChip } from "@/components/app/graph/panels/ResetChip";
import { SANDBOX_EXPLODE_CTA, SANDBOX_FULL_NODE_LABEL } from "@/utils/constants/landing";
import type { GraphIndexes } from "@/components/app/graph/logic/indexes";
import type { FullGraphPayload, PositionMap } from "@/components/app/graph/types";

/** Biggest couple of event circles auto-enabled so the "circles form
 *  themselves" hull overlay is visible without the app's layers panel. */
const AUTO_CIRCLE_COUNT = 2;

/**
 * The standalone sigma widget — a slim fork of GraphCanvas that reuses the
 * app's renderer modules verbatim (create-sigma/reducers/theme/camera/
 * hover-gate/use-render-sync) but drops every DB/auth/navigation surface
 * (NodePanel, WarmPathPanel, tag layer, layout-sync). Positions are baked, so
 * there is no layout compute. Remounted with a fresh `key` per dataset.
 */
export function GraphStage({
  payload,
  indexes,
  positions,
  explodable,
  exploding,
  onExplode,
}: {
  payload: FullGraphPayload;
  indexes: GraphIndexes;
  positions: PositionMap;
  explodable: boolean;
  exploding: boolean;
  onExplode: () => void;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderStateRef = useRef(emptyRenderState());
  const view = useViewState();

  const renderer = useRenderer(containerRef, payload, indexes, positions, renderStateRef, {
    onNodeClick: (nodeId) => view.select(nodeId),
    onNodeDoubleClick: (nodeId) => {
      const kind = indexes.nodeById.get(nodeId)?.kind;
      if (kind === "company" || kind === "event") view.toggleCollapsed(nodeId);
    },
    onStageClick: () => view.exitIsolate(),
    onEdgeClick: () => {},
  });

  const hiddenNodes = useRenderSync(renderer, indexes, view, renderStateRef);

  const { toggleCircle } = view;
  const circleSeeds = useMemo(
    () => buildCircleOptions(payload.nodes, indexes).slice(0, AUTO_CIRCLE_COUNT).map((c) => c.id),
    [payload.nodes, indexes],
  );
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || circleSeeds.length === 0) return;
    seededRef.current = true;
    for (const id of circleSeeds) toggleCircle(id);
  }, [circleSeeds, toggleCircle]);

  const isolated = view.isolateRootId !== null;

  return (
    <>
      {renderer && view.circleIds.size > 0 ? (
        <CirclesUnderlay
          renderer={renderer}
          indexes={indexes}
          circleIds={view.circleIds}
          hiddenNodes={hiddenNodes}
        />
      ) : null}
      <div ref={containerRef} className="absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-end">
        <GraphSearch nodes={payload.nodes} nodeTypes={payload.nodeTypes} onPick={view.select} />
      </div>

      {renderer ? (
        <GraphControls
          renderer={renderer}
          visibleNodeIds={() => renderer.getGraph().filterNodes((id) => !hiddenNodes.has(id))}
        />
      ) : null}

      {isolated ? (
        <ResetChip
          onReset={() => {
            view.exitIsolate();
            if (renderer) resetCamera(renderer);
          }}
        />
      ) : null}

      {explodable && !isolated ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-16">
          <Button
            variant="outline"
            size="sm"
            loading={exploding}
            onClick={onExplode}
            className="pointer-events-auto shadow-lg backdrop-blur"
          >
            {SANDBOX_EXPLODE_CTA} ({SANDBOX_FULL_NODE_LABEL})
          </Button>
        </div>
      ) : null}
    </>
  );
}
