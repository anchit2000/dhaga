"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ClusterEntry } from "../graph-state";
import type { BrowserFlowNode } from "../nodes";

export interface FocusTarget {
  contactId: string;
  clusterKey: string;
}

interface UseGraphFocusOptions {
  focusTarget: FocusTarget | null;
  focusMissing: boolean;
  nodes: BrowserFlowNode[];
  loaded: Map<string, ClusterEntry>;
  positions: Map<string, { x: number; y: number }>;
  focus: (position: { x: number; y: number }) => void;
  expandCluster: (key: string) => Promise<void>;
  setFocusedId: (id: string | null) => void;
}

/**
 * Deep link from a contact's profile page ("View in graph"): pan to their
 * cluster and expand it (kickoff), then once buildFlow recomputes with that
 * cluster's contacts loaded, pan precisely to the contact's own node and flag
 * it for highlighting. Falls back to a toast if the contact never surfaces
 * (e.g. truncated out of an oversized company by GRAPH_CLUSTER_CONTACT_CAP).
 */
export function useGraphFocus({
  focusTarget,
  focusMissing,
  nodes,
  loaded,
  positions,
  focus,
  expandCluster,
  setFocusedId,
}: UseGraphFocusOptions) {
  const kickoffRef = useRef(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (focusMissing) toast.error("Couldn't find that contact.");
  }, [focusMissing]);

  useEffect(() => {
    if (!focusTarget || appliedRef.current) return;
    const target = nodes.find((node) => node.id === focusTarget.contactId);
    if (target) {
      appliedRef.current = true;
      focus(target.position);
      setFocusedId(target.id);
      return;
    }
    if (loaded.has(focusTarget.clusterKey)) {
      appliedRef.current = true;
      toast.error("Couldn't pinpoint that contact automatically — try ⌘K search instead.");
    }
  }, [nodes, loaded, focusTarget, focus, setFocusedId]);

  function kickoff(): void {
    if (!focusTarget || kickoffRef.current) return;
    kickoffRef.current = true;
    const pos = positions.get(focusTarget.clusterKey);
    if (pos) focus(pos);
    void expandCluster(focusTarget.clusterKey);
  }

  function clearFocus(): void {
    setFocusedId(null);
  }

  return { kickoff, clearFocus };
}
