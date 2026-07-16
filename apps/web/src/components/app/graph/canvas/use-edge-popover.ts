"use client";

import { useCallback, useRef, useState } from "react";
import { edgeLabel } from "../logic/style";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { GraphIndexes } from "../logic/indexes";
import type { EdgePopoverData } from "../panels/EdgePopover";
import type { FullGraphEdge } from "../types";

export interface EdgePopoverApi {
  popover: EdgePopoverData | null;
  closePopover: () => void;
  /** Sigma clickEdge handler — reads the edge map through a ref, so it's safe
   *  to capture at renderer construction. */
  onEdgeClick: (edgeId: string, x: number, y: number) => void;
  /** Refresh the clickable edge map — tagged edges arrive after the renderer
   *  exists, as the lazy tag layer merges in. */
  setPopoverEdges: (edges: readonly FullGraphEdge[]) => void;
}

/** Owns the edge-click popover state and its late-growing edge lookup. */
export function useEdgePopover(
  indexes: GraphIndexes,
  labelMap: RelationshipLabelMap,
): EdgePopoverApi {
  const [popover, setPopover] = useState<EdgePopoverData | null>(null);
  const edgeByIdRef = useRef<ReadonlyMap<string, FullGraphEdge>>(new Map());

  const setPopoverEdges = useCallback((edges: readonly FullGraphEdge[]) => {
    edgeByIdRef.current = new Map(edges.map((edge) => [edge.id, edge]));
  }, []);
  const closePopover = useCallback(() => setPopover(null), []);
  const onEdgeClick = useCallback(
    (edgeId: string, x: number, y: number) => {
      const edge = edgeByIdRef.current.get(edgeId);
      const source = edge && indexes.nodeById.get(edge.source);
      const target = edge && indexes.nodeById.get(edge.target);
      if (!edge || !source || !target) return;
      setPopover({ edgeId, label: edgeLabel(edge, labelMap), source, target, x, y });
    },
    [indexes, labelMap],
  );

  return { popover, closePopover, onEdgeClick, setPopoverEdges };
}
