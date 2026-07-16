"use client";

import { useCallback, useEffect, useState } from "react";
import { GRAPH_LAYERS_STORAGE_KEY, GRAPH_MAX_ENABLED_CIRCLES } from "@/utils/constants/graph";
import type { LayerKey } from "../types";

export interface GraphViewStateApi {
  hiddenLayers: ReadonlySet<LayerKey>;
  toggleLayer: (key: LayerKey) => void;
  collapsedGroups: ReadonlySet<string>;
  toggleCollapsed: (groupId: string) => void;
  selectedId: string | null;
  isolateRootId: string | null;
  select: (nodeId: string | null) => void;
  closePanel: () => void;
  exitIsolate: () => void;
  circleIds: ReadonlySet<string>;
  toggleCircle: (nodeId: string) => void;
  highlightedPath: readonly string[] | null;
  setHighlightedPath: (nodeIds: readonly string[] | null) => void;
}

/**
 * One source of truth for the graph's view state. The layers set feeds both
 * the layers panel and the type multi-select; selection and isolate move
 * together (click = inspect + focus the neighbourhood) but clear separately —
 * closing the panel keeps the isolate so "people I met at this event" stays
 * readable after the sheet is dismissed.
 */
export function useViewState(): GraphViewStateApi {
  const [hiddenLayers, setHiddenLayers] = useState<ReadonlySet<LayerKey>>(() => loadHiddenLayers());
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isolateRootId, setIsolateRootId] = useState<string | null>(null);
  const [circleIds, setCircleIds] = useState<ReadonlySet<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<readonly string[] | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(GRAPH_LAYERS_STORAGE_KEY, JSON.stringify([...hiddenLayers]));
    } catch {
      /* quota/private mode — layer state just won't persist */
    }
  }, [hiddenLayers]);

  const toggleLayer = useCallback((key: LayerKey) => {
    setHiddenLayers((prev) => toggled(prev, key));
  }, []);
  const toggleCollapsed = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => toggled(prev, groupId));
  }, []);
  const toggleCircle = useCallback((nodeId: string) => {
    setCircleIds((prev) => {
      if (!prev.has(nodeId) && prev.size >= GRAPH_MAX_ENABLED_CIRCLES) return prev;
      return toggled(prev, nodeId);
    });
  }, []);

  const select = useCallback((nodeId: string | null) => {
    setSelectedId(nodeId);
    setIsolateRootId(nodeId);
    if (nodeId) setHighlightedPath(null);
  }, []);
  const closePanel = useCallback(() => setSelectedId(null), []);
  const exitIsolate = useCallback(() => {
    setIsolateRootId(null);
    setSelectedId(null);
    setHighlightedPath(null);
  }, []);

  return {
    hiddenLayers,
    toggleLayer,
    collapsedGroups,
    toggleCollapsed,
    selectedId,
    isolateRootId,
    select,
    closePanel,
    exitIsolate,
    circleIds,
    toggleCircle,
    highlightedPath,
    setHighlightedPath,
  };
}

function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function loadHiddenLayers(): Set<LayerKey> {
  // Tags default OFF: the tag layer is by far the heaviest (contacts × tags)
  // and is lazy-loaded on first enable (use-tag-layer). A stored preference —
  // including an explicit "tags on" — still wins.
  const fallback = new Set<LayerKey>(["tag"]);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(GRAPH_LAYERS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((key): key is string => typeof key === "string"))
      : fallback;
  } catch {
    return fallback;
  }
}
