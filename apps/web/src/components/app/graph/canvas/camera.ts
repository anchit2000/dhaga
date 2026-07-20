import { GRAPH_CAMERA_DURATION_MS } from "@/utils/constants/graph";
import { isRendererAlive } from "./renderer-lifecycle";
import type { GraphRenderer } from "./create-sigma";

/** Ease the camera to a node, zooming in if currently far out. */
export function flyToNode(sigma: GraphRenderer, nodeId: string): void {
  if (!isRendererAlive(sigma)) return; // killed on swap; caller re-fires next render
  const data = sigma.getNodeDisplayData(nodeId);
  if (!data) return;
  const camera = sigma.getCamera();
  void camera.animate(
    { x: data.x, y: data.y, ratio: Math.min(camera.ratio, 0.2) },
    { duration: GRAPH_CAMERA_DURATION_MS },
  );
}

/**
 * Fit the camera to a set of nodes (isolate neighbourhoods, warm paths).
 * Works in sigma's framed coordinate space, where the whole graph spans
 * roughly one unit — ratio ≈ span means "this box fills the viewport".
 */
export function fitToNodes(sigma: GraphRenderer, nodeIds: Iterable<string>): void {
  if (!isRendererAlive(sigma)) return; // killed on swap; caller re-fires next render
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let count = 0;
  for (const id of nodeIds) {
    const data = sigma.getNodeDisplayData(id);
    if (!data) continue;
    minX = Math.min(minX, data.x);
    minY = Math.min(minY, data.y);
    maxX = Math.max(maxX, data.x);
    maxY = Math.max(maxY, data.y);
    count += 1;
  }
  if (count === 0) return;

  const span = Math.max(maxX - minX, maxY - minY);
  const ratio = Math.max(0.02, Math.min(1.2, span * 1.4 + 0.02));
  void sigma.getCamera().animate(
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2, ratio },
    { duration: GRAPH_CAMERA_DURATION_MS },
  );
}

/**
 * Zoom the camera by a multiplicative factor around its current centre.
 * `factor < 1` zooms in (smaller ratio), `factor > 1` zooms out; the result is
 * clamped to the renderer's own min/max camera ratio so the buttons can never
 * push past what drag-zoom allows.
 */
export function zoomByFactor(sigma: GraphRenderer, factor: number): void {
  if (!isRendererAlive(sigma)) return; // killed on swap; caller re-fires next render
  const camera = sigma.getCamera();
  const min = sigma.getSetting("minCameraRatio") ?? 0;
  const max = sigma.getSetting("maxCameraRatio") ?? Number.POSITIVE_INFINITY;
  const ratio = Math.max(min, Math.min(max, camera.ratio * factor));
  void camera.animate({ ratio }, { duration: GRAPH_CAMERA_DURATION_MS });
}

/** Reset to the default full-graph view. */
export function resetCamera(sigma: GraphRenderer): void {
  if (!isRendererAlive(sigma)) return;
  void sigma.getCamera().animate(
    { x: 0.5, y: 0.5, ratio: 1, angle: 0 },
    { duration: GRAPH_CAMERA_DURATION_MS },
  );
}
