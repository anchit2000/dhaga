"use client";

import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GRAPH_ZOOM_STEP } from "@/utils/constants/graph";
import { fitToNodes, resetCamera, zoomByFactor } from "../canvas/camera";
import type { GraphRenderer } from "../canvas/create-sigma";

/**
 * Bottom-right camera cluster: zoom in / zoom out / fit-to-view / reset. Sits
 * clear of the bottom-centre ResetChip. No pan tool — sigma already drag-pans.
 * Every button routes through the camera helpers, which no-op safely if the
 * renderer was swapped mid-commit (isRendererAlive guard).
 */
export function GraphControls({
  renderer,
  visibleNodeIds,
}: {
  renderer: GraphRenderer;
  /** All node ids to frame on "fit to view" (visible layers only). */
  visibleNodeIds: () => Iterable<string>;
}): React.ReactElement {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-3 z-20 flex flex-col gap-1 rounded-full border border-seam bg-panel/90 p-1 shadow-lg backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => zoomByFactor(renderer, 1 / GRAPH_ZOOM_STEP)}
      >
        <ZoomIn aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => zoomByFactor(renderer, GRAPH_ZOOM_STEP)}
      >
        <ZoomOut aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Fit to view"
        title="Fit to view"
        onClick={() => fitToNodes(renderer, visibleNodeIds())}
      >
        <Maximize2 aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reset view"
        title="Reset view"
        onClick={() => resetCamera(renderer)}
      >
        <RotateCcw aria-hidden />
      </Button>
    </div>
  );
}
