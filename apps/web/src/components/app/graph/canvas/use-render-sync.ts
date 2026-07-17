"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { collapsedMemberCount, contactsHiddenByCollapse } from "../logic/collapse";
import { computeHiddenNodes } from "../logic/visibility";
import { fitToNodes } from "./camera";
import { applyThemeToGraph, applyThemeToRenderer, type GraphRenderer } from "./create-sigma";
import { isRendererAlive } from "./renderer-lifecycle";
import { resolveGraphTheme } from "./theme";
import type { GraphIndexes } from "../logic/indexes";
import type { RenderState } from "./reducers";
import type { GraphViewStateApi } from "./use-view-state";

/**
 * Pushes React view state into the reducers' mutable render state and asks
 * sigma for a cheap refresh — filters, isolate, collapse and path emphasis
 * are all instant view changes on the same graphology graph.
 */
export function useRenderSync(
  renderer: GraphRenderer | null,
  indexes: GraphIndexes,
  view: GraphViewStateApi,
  renderStateRef: React.RefObject<RenderState>,
): ReadonlySet<string> {
  // The collapse swallow-set feeds both the hidden-node sweep and the count
  // badges — computed once. Selection and path emphasis never affect
  // visibility (they're applied via renderStateRef below), so neither memo
  // re-runs the O(n) sweep when the panel closes or a warm path shows.
  const hiddenByCollapse = useMemo(
    () => contactsHiddenByCollapse(indexes, view.collapsedGroups, view.hiddenLayers),
    [indexes, view.collapsedGroups, view.hiddenLayers],
  );

  const hiddenNodes = useMemo(
    () =>
      computeHiddenNodes(
        indexes,
        { hiddenLayers: view.hiddenLayers, isolateRootId: view.isolateRootId },
        hiddenByCollapse,
      ),
    [indexes, view.hiddenLayers, view.isolateRootId, hiddenByCollapse],
  );

  const collapsedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const groupId of view.collapsedGroups) {
      counts.set(groupId, collapsedMemberCount(groupId, indexes, hiddenByCollapse));
    }
    return counts;
  }, [indexes, view.collapsedGroups, hiddenByCollapse]);

  useEffect(() => {
    // The alive check covers the swap commit: these effects can fire with the
    // just-killed renderer still in state (see trackRendererDeath).
    if (!renderer || !isRendererAlive(renderer)) return;
    const state = renderStateRef.current;
    state.hiddenNodes = hiddenNodes;
    state.selectedId = view.selectedId;
    state.collapsedCounts = collapsedCounts;
    state.highlightedPath = view.highlightedPath ? new Set(view.highlightedPath) : null;
    renderer.refresh({ skipIndexation: true });
  }, [renderer, renderStateRef, hiddenNodes, collapsedCounts, view.selectedId, view.highlightedPath]);

  // Isolate eases the camera to fit the surviving neighbourhood — once per
  // root. Layer/collapse toggles while isolated refresh visibility (new
  // hiddenNodes set) but must not move the camera again.
  const lastFitRootRef = useRef<string | null>(null);
  useEffect(() => {
    if (!renderer || !view.isolateRootId) {
      lastFitRootRef.current = null;
      return;
    }
    if (!isRendererAlive(renderer)) return;
    if (lastFitRootRef.current === view.isolateRootId) return;
    lastFitRootRef.current = view.isolateRootId;
    const keep = [view.isolateRootId];
    for (const neighborId of indexes.neighbors.get(view.isolateRootId) ?? []) {
      if (!hiddenNodes.has(neighborId)) keep.push(neighborId);
    }
    fitToNodes(renderer, keep);
  }, [renderer, indexes, view.isolateRootId, hiddenNodes]);

  // Follow /app's light/dark toggle without rebuilding the graph.
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!renderer || !isRendererAlive(renderer)) return;
    const theme = resolveGraphTheme(renderer.getContainer());
    applyThemeToGraph(renderer.getGraph(), theme);
    applyThemeToRenderer(renderer, theme);
    renderer.refresh();
  }, [renderer, resolvedTheme]);

  return hiddenNodes;
}
