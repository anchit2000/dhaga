"use client";

import { useEffect, useRef, useState } from "react";
import { GRAPH_EDGE_LABEL_RATIO_THRESHOLD } from "@/utils/constants/graph";
import { buildRenderGraph, createRenderer, type GraphRenderer } from "./create-sigma";
import { createHoverGate } from "./hover-gate";
import { resolveGraphTheme } from "./theme";
import type { GraphIndexes } from "../logic/indexes";
import type { RenderState } from "./reducers";
import type { FullGraphPayload, PositionMap } from "../types";

export interface RendererHandlers {
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onStageClick: () => void;
  onEdgeClick: (edgeId: string, x: number, y: number) => void;
}

/**
 * Owns the sigma lifecycle. Handlers are read through a ref so React renders
 * never re-wire sigma events, and the reducers' render state lives in the
 * caller's ref — sigma itself is constructed exactly once per payload.
 */
export function useRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  payload: FullGraphPayload,
  indexes: GraphIndexes,
  positions: PositionMap,
  renderStateRef: React.RefObject<RenderState>,
  handlers: RendererHandlers,
): GraphRenderer | null {
  const [renderer, setRenderer] = useState<GraphRenderer | null>(null);
  const handlersRef = useRef(handlers);
  // Viewport survives in-place payload swaps (background revalidation): the
  // outgoing sigma's camera state is captured on teardown and restored on
  // the next construction. First mount starts from the default camera, and
  // a full remount (refetch path) discards the ref with the component.
  const cameraRef = useRef<{ x: number; y: number; ratio: number; angle: number } | null>(null);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = resolveGraphTheme(container);
    const graph = buildRenderGraph(payload, positions, theme, indexes);
    const sigma = createRenderer(container, graph, theme, renderStateRef);
    if (cameraRef.current) sigma.getCamera().setState(cameraRef.current);

    sigma.on("clickNode", ({ node }) => handlersRef.current.onNodeClick(node));
    sigma.on("doubleClickNode", (event) => {
      event.preventSigmaDefault(); // double-click toggles collapse, not zoom
      handlersRef.current.onNodeDoubleClick(event.node);
    });
    sigma.on("clickStage", () => handlersRef.current.onStageClick());
    sigma.on("clickEdge", ({ edge, event }) =>
      handlersRef.current.onEdgeClick(edge, event.x, event.y),
    );
    // Hover emphasis bypasses React entirely: a ref write + cheap refresh.
    // The gate rAF-coalesces event bursts and mutes hover while the pointer
    // is down — a drag-pan streams nodes under the cursor, and each
    // enter/leave used to cost a full reducer sweep (measured: 17 fps pans at
    // 63k edges). Click selection is untouched: clickNode is sigma's own
    // no-drag down+up detection and never routes through the gate.
    const hoverGate = createHoverGate((hoveredId) => {
      renderStateRef.current.hoveredId = hoveredId;
      renderStateRef.current.hoveredNeighbors =
        hoveredId === null ? null : (indexes.neighbors.get(hoveredId) ?? null);
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on("enterNode", ({ node }) => hoverGate.enter(node));
    sigma.on("leaveNode", () => hoverGate.leave());
    const onPointerDown = (): void => hoverGate.pointerDown();
    const onPointerUp = (): void => hoverGate.pointerUp();
    container.addEventListener("pointerdown", onPointerDown);
    // Up/cancel land on window — a drag can end outside the container.
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    // Edge labels appear only past a zoom threshold; refresh exactly when the
    // camera crosses it instead of re-running reducers every frame.
    const camera = sigma.getCamera();
    const onCameraUpdate = (): void => {
      const zoomedIn = camera.ratio < GRAPH_EDGE_LABEL_RATIO_THRESHOLD;
      if (zoomedIn !== renderStateRef.current.edgeLabelsVisible) {
        renderStateRef.current.edgeLabelsVisible = zoomedIn;
        sigma.refresh({ skipIndexation: true });
      }
    };
    camera.on("updated", onCameraUpdate);

    setRenderer(sigma);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      hoverGate.dispose();
      camera.off("updated", onCameraUpdate);
      cameraRef.current = camera.getState();
      sigma.kill();
      setRenderer(null);
    };
    // renderStateRef and containerRef are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, indexes, positions]);

  return renderer;
}
