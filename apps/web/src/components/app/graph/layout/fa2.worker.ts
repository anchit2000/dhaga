import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { GRAPH_FA2_CHUNK_ITERATIONS, GRAPH_FA2_SETTLE_RATIO } from "@/utils/constants/graph";
import type { LayoutRequest, WorkerReply } from "./messages";

/**
 * ForceAtlas2 off the main thread. 50 iterations at 20k nodes cost ~6.7s —
 * running them here keeps the page interactive while the branded progress
 * bar advances. Runs a bounded, chunked pass and STOPS: either the iteration
 * budget is spent or mean movement per chunk settles below a small fraction
 * of the layout's radius (early exit saves seconds on easy graphs).
 */
self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { positions, edges, iterations } = event.data;
  const nodeCount = positions.length / 2;

  const graph = new Graph({ multi: true, type: "directed" });
  for (let i = 0; i < nodeCount; i += 1) {
    graph.addNode(String(i), { x: positions[i * 2], y: positions[i * 2 + 1] });
  }
  for (let e = 0; e < edges.length; e += 2) {
    graph.addEdge(String(edges[e]), String(edges[e + 1]));
  }

  const settings = {
    ...forceAtlas2.inferSettings(nodeCount),
    barnesHutOptimize: nodeCount > 2_000,
  };

  let previous = readPositions(graph, nodeCount);
  let completed = 0;
  while (completed < iterations) {
    const chunk = Math.min(GRAPH_FA2_CHUNK_ITERATIONS, iterations - completed);
    forceAtlas2.assign(graph, { iterations: chunk, settings });
    completed += chunk;

    const current = readPositions(graph, nodeCount);
    const settled = meanMovement(previous, current) < layoutRadius(current) * GRAPH_FA2_SETTLE_RATIO;
    previous = current;
    post({ type: "progress", done: completed / iterations });
    if (settled) break;
  }

  const final = readPositions(graph, nodeCount);
  (self as unknown as Worker).postMessage({ type: "done", positions: final } satisfies WorkerReply, [
    final.buffer,
  ]);
};

function post(reply: WorkerReply): void {
  (self as unknown as Worker).postMessage(reply);
}

function readPositions(graph: Graph, nodeCount: number): Float64Array {
  const out = new Float64Array(nodeCount * 2);
  for (let i = 0; i < nodeCount; i += 1) {
    const attrs = graph.getNodeAttributes(String(i));
    out[i * 2] = attrs.x as number;
    out[i * 2 + 1] = attrs.y as number;
  }
  return out;
}

function meanMovement(a: Float64Array, b: Float64Array): number {
  let total = 0;
  const count = a.length / 2;
  for (let i = 0; i < count; i += 1) {
    total += Math.hypot(b[i * 2] - a[i * 2], b[i * 2 + 1] - a[i * 2 + 1]);
  }
  return count > 0 ? total / count : 0;
}

function layoutRadius(positions: Float64Array): number {
  let max = 1;
  for (let i = 0; i < positions.length; i += 2) {
    max = Math.max(max, Math.abs(positions[i]), Math.abs(positions[i + 1]));
  }
  return max;
}
