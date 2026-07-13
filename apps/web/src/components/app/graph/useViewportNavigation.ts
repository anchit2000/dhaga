"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Edge, ReactFlowInstance, Viewport } from "@xyflow/react";
import {
  GRAPH_CAMERA_DURATION_MS,
  GRAPH_FOCUS_ZOOM,
  GRAPH_INITIAL_ZOOM,
} from "@/utils/constants/graph";
import type { Cluster } from "@/lib/repo/graph-data";
import type { BrowserFlowNode } from "./nodes";
import {
  graphViewport,
  INITIAL_WORLD_BOUNDS,
  worldBounds,
  type DirectionCounts,
} from "./viewport";

export function useViewportNavigation(clusters: Cluster[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<ReactFlowInstance<BrowserFlowNode, Edge> | null>(null);
  const [bounds, setBounds] = useState(INITIAL_WORLD_BOUNDS);
  const result = useMemo(() => graphViewport(clusters, bounds), [clusters, bounds]);
  const setContainer = useCallback((element: HTMLDivElement | null): void => {
    containerRef.current = element;
  }, []);

  function syncBounds(viewport: Viewport): void {
    const element = containerRef.current;
    if (!element) return;
    setBounds(worldBounds(viewport, element.clientWidth, element.clientHeight));
  }

  async function initialize(instance: ReactFlowInstance<BrowserFlowNode, Edge>): Promise<void> {
    flowRef.current = instance;
    const home = result.positions.get(clusters[0]?.key ?? "");
    if (home) await instance.setCenter(home.x, home.y, { zoom: GRAPH_INITIAL_ZOOM });
    syncBounds(instance.getViewport());
  }

  function focus(position: { x: number; y: number }): void {
    void flowRef.current?.setCenter(position.x, position.y, {
      zoom: GRAPH_FOCUS_ZOOM,
      duration: GRAPH_CAMERA_DURATION_MS,
    });
  }

  async function navigate(direction: keyof DirectionCounts): Promise<void> {
    const instance = flowRef.current;
    const target = result.targets[direction];
    if (!instance || !target) return;
    await instance.setCenter(target.x, target.y, {
      zoom: instance.getZoom(),
      duration: GRAPH_CAMERA_DURATION_MS,
    });
    syncBounds(instance.getViewport());
  }

  return { setContainer, result, initialize, focus, navigate, syncBounds };
}
