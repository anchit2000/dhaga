import { GRAPH_REFINE_ITERATIONS } from "@/utils/constants/graph";
import { fa2IterationsFor } from "../logic/iterations";
import { decideLayout, type LayoutSource } from "../logic/layout-precedence";
import { scheduleLayoutUpload } from "../logic/layout-sync";
import { neighborCentroid, seedPositions } from "../logic/seeding";
import {
  graphHash,
  loadPositionCache,
  savePositionCache,
} from "../logic/position-cache";
import { runWorker } from "./worker-runner";
import type { GraphIndexes } from "../logic/indexes";
import type { FullGraphPayload, PositionMap } from "../types";

export interface LayoutResult {
  positions: PositionMap;
  /** Which caching tier produced the positions (perf beacon field). */
  source: LayoutSource;
}

export interface LayoutRun {
  result: Promise<LayoutResult>;
  cancel: () => void;
}

/**
 * Full layout pipeline: tiered position caches (exact hit → skip FA2
 * entirely; see decideLayout for the L1 localStorage / L2 server order) →
 * warm start or deterministic cluster seed → bounded FA2 in a module worker.
 * The main thread only ever seeds and forwards progress — it never iterates.
 * Whenever the settled hash differs from the server's copy, the positions
 * are uploaded fire-and-forget so the user's other devices hit L2.
 */
export function runLayout(
  payload: FullGraphPayload,
  indexes: GraphIndexes,
  onProgress: (share: number) => void,
): LayoutRun {
  let worker: Worker | null = null;
  let cancelled = false;

  const result = (async (): Promise<LayoutResult> => {
    const hash = graphHash(payload.nodes, payload.edges);
    const nodeIds = payload.nodes.map((node) => node.id);
    const store = typeof window === "undefined" ? null : window.localStorage;
    const local = store ? loadPositionCache(store, hash, nodeIds) : null;
    const decision = decideLayout(local, payload.layout ?? null, hash, nodeIds);

    if (decision.kind === "exact") {
      onProgress(1);
      // L1 hit the server hasn't seen (layout predates the feature, or was
      // settled offline): propagate it so other devices skip FA2 too.
      if (payload.layout?.hash !== hash) scheduleLayoutUpload(hash, decision.positions);
      return { positions: decision.positions, source: decision.source };
    }

    let seed: PositionMap;
    let iterations: number;
    if (decision.kind === "warm") {
      // Warm start: most nodes keep their settled spot; newcomers join at
      // their neighbours' centroid and a short refine pass smooths them in.
      seed = decision.seed;
      for (const node of payload.nodes) {
        if (seed.has(node.id)) continue;
        seed.set(node.id, neighborCentroid(node.id, indexes, seed) ?? { x: 0, y: 0 });
      }
      iterations = GRAPH_REFINE_ITERATIONS;
    } else {
      seed = seedPositions(payload.nodes, payload.edges, indexes);
      iterations = fa2IterationsFor(payload.nodes.length);
    }

    const settled = await runWorker(payload, nodeIds, seed, iterations, onProgress, (w) => {
      worker = w;
      if (cancelled) w.terminate();
    });
    if (store && !cancelled) savePositionCache(store, hash, settled);
    if (!cancelled && payload.layout?.hash !== hash) scheduleLayoutUpload(hash, settled);
    return { positions: settled, source: "computed" };
  })();

  return {
    result,
    cancel: () => {
      cancelled = true;
      worker?.terminate();
    },
  };
}
