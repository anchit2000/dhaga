import { runFa2 } from "./fa2-core";
import type { LayoutRequest, WorkerReply } from "./messages";

/**
 * ForceAtlas2 off the main thread. Receives the seeded positions + edges,
 * runs the shared bounded FA2 pass (see fa2-core.ts), and streams progress
 * back so the branded progress bar advances while the page stays interactive.
 */
self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { positions, edges, iterations } = event.data;
  const final = runFa2(positions, edges, iterations, (done) => {
    (self as unknown as Worker).postMessage({ type: "progress", done } satisfies WorkerReply);
  });
  (self as unknown as Worker).postMessage({ type: "done", positions: final } satisfies WorkerReply, [
    final.buffer,
  ]);
};
