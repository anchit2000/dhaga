"use client";

import { useCallback, useRef } from "react";

export interface SpokeSelectApi {
  /** Selection wrapper: ensure a truncated tag hub's spokes are merged, THEN
   *  select — so isolate and the camera fit include the members. Plain nodes
   *  and under-budget graphs resolve immediately (a microtask, no fetch). */
  selectNode: (nodeId: string | null) => void;
  /** Point this at the live ensureTagSpokes once useTagLayer has run — the
   *  renderer's click handlers are wired before it exists (hence the ref). */
  ensureSpokesRef: React.RefObject<(nodeId: string) => Promise<void>>;
}

/** Couples selection to the per-tag spoke loader without re-wiring sigma. */
export function useSpokeSelect(select: (nodeId: string | null) => void): SpokeSelectApi {
  const ensureSpokesRef = useRef<(nodeId: string) => Promise<void>>(() => Promise.resolve());
  const selectNode = useCallback(
    (nodeId: string | null) => {
      if (nodeId) void ensureSpokesRef.current(nodeId).then(() => select(nodeId));
      else select(null);
    },
    [select],
  );
  return { selectNode, ensureSpokesRef };
}
