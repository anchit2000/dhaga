"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { GRAPH_FOCUS_SWAP_GRACE_MS } from "@/utils/constants/graph";
import { fitToNodes } from "./camera";
import { isRendererAlive } from "./renderer-lifecycle";
import type { GraphIndexes } from "../logic/indexes";
import type { GraphRenderer } from "./create-sigma";

export interface PathRequest {
  ids: readonly string[];
  nonce: number;
}

/**
 * ?focus=<contactId> deep link: select + isolate + panel once the canvas is
 * live. A boot from the IndexedDB cache can predate the focused node (add a
 * person → follow their "View in graph" link): a miss doesn't give up — the
 * background-revalidation swap re-runs this effect with fresh indexes and the
 * select then succeeds. Only after a grace period with no swap surfacing the
 * node (e.g. the revalidation 304'd because it truly doesn't exist) does the
 * toast fire.
 */
export function useFocusDeepLink(
  renderer: GraphRenderer | null,
  focusId: string | null,
  indexes: GraphIndexes,
  select: (nodeId: string) => void,
): void {
  const settled = useRef(false);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // The alive check must precede consuming the one-shot: firing against the
    // swap commit's killed renderer would burn the attempt without acting.
    if (!renderer || !isRendererAlive(renderer) || !focusId || settled.current) return;
    if (indexes.nodeById.has(focusId)) {
      settled.current = true;
      if (giveUp.current) clearTimeout(giveUp.current);
      select(focusId);
      return;
    }
    giveUp.current ??= setTimeout(() => {
      if (!settled.current) {
        settled.current = true;
        toast.error("That person isn't in the graph yet.");
      }
    }, GRAPH_FOCUS_SWAP_GRACE_MS);
  }, [renderer, focusId, indexes, select]);
  useEffect(
    () => () => {
      if (giveUp.current) clearTimeout(giveUp.current);
    },
    [],
  );
}

/** Warm-path "show on graph": emphasize the chain and fit the camera to it. */
export function usePathRequest(
  renderer: GraphRenderer | null,
  pathRequest: PathRequest | null,
  indexes: GraphIndexes,
  setHighlightedPath: (ids: readonly string[] | null) => void,
): void {
  useEffect(() => {
    if (!renderer || !isRendererAlive(renderer) || !pathRequest) return;
    const known = pathRequest.ids.filter((id) => indexes.nodeById.has(id));
    if (known.length === 0) return;
    setHighlightedPath(known);
    fitToNodes(renderer, known);
  }, [renderer, pathRequest, indexes, setHighlightedPath]);
}
