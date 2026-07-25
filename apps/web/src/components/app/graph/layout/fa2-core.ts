import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { GRAPH_FA2_CHUNK_ITERATIONS, GRAPH_FA2_SETTLE_RATIO } from "@/utils/constants/graph";

/**
 * Shared ForceAtlas2 core — the only place the layout is actually iterated.
 * Called from both the module worker (fast path, off the main thread) and the
 * main-thread fallback in run-layout.ts (used when the worker fails to load).
 *
 * Builds a graphology graph from the flat position/edge index buffers, then
 * runs a bounded, chunked FA2 pass and STOPS: either the iteration budget is
 * spent or mean movement per chunk settles below a small fraction of the
 * layout's radius (early exit saves seconds on easy graphs). 50 iterations at
 * 20k nodes cost ~6.7s. Pure — no worker/DOM dependency.
 *
 * @param positions Seed layout; node i owns positions[2i], positions[2i+1].
 * @param edges Edge pairs as node indices: [src0, dst0, src1, dst1, ...].
 * @param iterations Upper bound on FA2 iterations.
 * @param onProgress Optional 0..1 share callback, fired after each chunk.
 * @returns Fresh Float64Array of settled positions, same [x, y] packing.
 */
export function runFa2(
  positions: Float64Array,
  edges: Uint32Array,
  iterations: number,
  onProgress?: (share: number) => void,
): Float64Array {
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
    onProgress?.(completed / iterations);
    if (settled) break;
  }

  return readPositions(graph, nodeCount);
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
