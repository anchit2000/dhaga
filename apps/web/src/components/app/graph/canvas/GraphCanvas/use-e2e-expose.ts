"use client";

import { useEffect } from "react";
import type { GraphRenderer } from "../create-sigma";

/**
 * Screenshot/E2E hook: expose the sigma renderer on window ONLY when the URL
 * carries ?e2e=1, so doc-screenshot automation can compute a node's exact
 * on-canvas position (renderer.graphToViewport) and drive the camera
 * deterministically. No-op in normal use.
 */
export function useE2eGraphExpose(renderer: GraphRenderer | null): void {
  useEffect(() => {
    if (!renderer || typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("e2e")) return;
    (window as unknown as { __dhagaGraph?: unknown }).__dhagaGraph = renderer;
    return () => {
      delete (window as unknown as { __dhagaGraph?: unknown }).__dhagaGraph;
    };
  }, [renderer]);
}
