"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { fitToNodes } from "./camera";
import type { GraphIndexes } from "../logic/indexes";
import type { GraphRenderer } from "./create-sigma";

export interface PathRequest {
  ids: readonly string[];
  nonce: number;
}

/** ?focus=<contactId> deep link: select + isolate + panel once the canvas is live. */
export function useFocusDeepLink(
  renderer: GraphRenderer | null,
  focusId: string | null,
  indexes: GraphIndexes,
  select: (nodeId: string) => void,
): void {
  const handled = useRef(false);
  useEffect(() => {
    if (!renderer || !focusId || handled.current) return;
    handled.current = true;
    if (indexes.nodeById.has(focusId)) {
      select(focusId);
    } else {
      toast.error("That person isn't in the graph yet.");
    }
  }, [renderer, focusId, indexes, select]);
}

/** Warm-path "show on graph": emphasize the chain and fit the camera to it. */
export function usePathRequest(
  renderer: GraphRenderer | null,
  pathRequest: PathRequest | null,
  indexes: GraphIndexes,
  setHighlightedPath: (ids: readonly string[] | null) => void,
): void {
  useEffect(() => {
    if (!renderer || !pathRequest) return;
    const known = pathRequest.ids.filter((id) => indexes.nodeById.has(id));
    if (known.length === 0) return;
    setHighlightedPath(known);
    fitToNodes(renderer, known);
  }, [renderer, pathRequest, indexes, setHighlightedPath]);
}
