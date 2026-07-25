import { runFa2 } from "./fa2-core";
import type { FullGraphPayload, PositionMap } from "../types";
import type { LayoutRequest, WorkerReply } from "./messages";

/**
 * Runs the bounded FA2 pass in the module worker (fast path, off the main
 * thread) and forwards progress. If the worker fails to load, it transparently
 * falls back to computing the same pass synchronously on the main thread so the
 * graph always renders — see the onerror comment for the Turbopack cause.
 */
export function runWorker(
  payload: FullGraphPayload,
  nodeIds: readonly string[],
  seed: PositionMap,
  iterations: number,
  onProgress: (share: number) => void,
  onWorker: (worker: Worker) => void,
): Promise<PositionMap> {
  const indexOf = new Map(nodeIds.map((id, index) => [id, index]));
  const flat = new Float64Array(nodeIds.length * 2);
  nodeIds.forEach((id, i) => {
    const pos = seed.get(id) ?? { x: 0, y: 0 };
    flat[i * 2] = pos.x;
    flat[i * 2 + 1] = pos.y;
  });
  const pairs: number[] = [];
  for (const edge of payload.edges) {
    const src = indexOf.get(edge.source);
    const dst = indexOf.get(edge.target);
    if (src === undefined || dst === undefined) continue;
    pairs.push(src, dst);
  }

  return new Promise<PositionMap>((resolve) => {
    const worker = new Worker(new URL("./fa2.worker.ts", import.meta.url), { type: "module" });
    onWorker(worker);
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      if (reply.type === "progress") {
        onProgress(reply.done);
        return;
      }
      worker.terminate();
      resolve(toPositionMap(nodeIds, reply.positions));
    };
    worker.onerror = () => {
      worker.terminate();
      // Module worker throws on load in Next 16 Turbopack production (shipped as
      // a classic importScripts worker, rejected by the /app COOP/COEP isolation
      // headers), so onerror fires empty on the cold/no-cache path. Fall back to
      // the same bounded FA2 pass on the MAIN thread — slower on large graphs and
      // it blocks paint, but positions are cached after the first run (see
      // savePositionCache in runLayout) so the graph always renders. `flat` is
      // intact here because only `edges` (below) is transferred, not positions.
      // TODO: fix the worker transport so the off-main-thread fast path works in
      // Turbopack production; then this fallback is only cold-start insurance.
      const settled = runFa2(flat, Uint32Array.from(pairs), iterations, onProgress);
      resolve(toPositionMap(nodeIds, settled));
    };
    const request: LayoutRequest = {
      type: "layout",
      positions: flat,
      edges: Uint32Array.from(pairs),
      iterations,
    };
    worker.postMessage(request, [request.edges.buffer]);
  });
}

/** Rebuild the id→{x,y} map from a flat [x0,y0,x1,y1,...] buffer (node i owns
 *  flat[2i], flat[2i+1]) — shared by the worker reply and main-thread fallback. */
function toPositionMap(nodeIds: readonly string[], flat: Float64Array): PositionMap {
  const result: PositionMap = new Map();
  nodeIds.forEach((id, i) => {
    result.set(id, { x: flat[i * 2], y: flat[i * 2 + 1] });
  });
  return result;
}
