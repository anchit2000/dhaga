"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { GraphRenderer } from "../create-sigma";
import type { TagLayerHub, TagLayerPayload } from "../../types";

export interface TagLayerFetchApi {
  status: "idle" | "loading" | "ready" | "error";
  /** Server-side bounds echoed by the payload: withheld spokes and hub cap. */
  bounds: {
    spokesTruncated: boolean;
    hubsTruncated: boolean;
    totalHubs: number;
  };
}

/**
 * Fetches /api/graph/tags the first time the Tags layer is enabled, tracking
 * load status and the server-echoed truncation bounds. Split from index.ts to
 * keep it under the 150-line rule — see index.ts for the merge/nodes/edges
 * half of the lazy tag layer this feeds.
 */
export function useTagLayerFetch(
  renderer: GraphRenderer | null,
  tagsEnabled: boolean,
  applyMerge: (layer: Pick<TagLayerPayload, "hubs" | "edges">, live: GraphRenderer) => void,
  registerHubs: (hubs: readonly TagLayerHub[]) => void,
  // aliveRef is re-armed by every effect run, so it goes false-for-good only
  // on real unmount — a late resolve must not merge into a killed renderer.
  aliveRef: React.RefObject<boolean>,
): TagLayerFetchApi {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [bounds, setBounds] = useState({
    spokesTruncated: false,
    hubsTruncated: false,
    totalHubs: 0,
  });
  // startedRef guards the whole attempt (StrictMode re-runs share it); the
  // promise ref keeps a mid-flight fetch reusable if the layer is re-toggled.
  const startedRef = useRef(false);
  const fetchRef = useRef<Promise<TagLayerPayload> | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    if (tagsEnabled && renderer && !startedRef.current) {
      startedRef.current = true;
      setStatus("loading");
      fetchRef.current ??= fetch("/api/graph/tags").then(async (res) => {
        if (!res.ok) throw new Error(`Tag layer request failed (${res.status})`);
        return (await res.json()) as TagLayerPayload;
      });
      fetchRef.current
        .then((layer) => {
          if (!aliveRef.current) return;
          if (layer.truncated) registerHubs(layer.hubs);
          setBounds({
            spokesTruncated: layer.truncated,
            hubsTruncated: layer.hubsTruncated,
            totalHubs: layer.totalHubs,
          });
          applyMerge(layer, renderer);
          setStatus("ready");
        })
        .catch(() => {
          startedRef.current = false; // the next enable retries
          fetchRef.current = null;
          if (!aliveRef.current) return;
          setStatus("error");
          toast.error("Couldn't load tags — toggle the Tags layer to retry.");
        });
    }
    return () => {
      aliveRef.current = false;
    };
  }, [renderer, tagsEnabled, applyMerge, registerHubs, aliveRef]);

  return { status, bounds };
}
