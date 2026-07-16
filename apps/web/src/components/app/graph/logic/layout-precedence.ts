import { GRAPH_WARM_START_MIN_OVERLAP } from "@/utils/constants/graph";
import type { CachedLayout } from "./position-cache";
import type { GraphLayoutSnapshot, PositionMap } from "../types";

/** Where the rendered positions ultimately came from (perf beacon field). */
export type LayoutSource = "localStorage" | "db" | "computed";

export type LayoutDecision =
  | { kind: "exact"; positions: PositionMap; source: "localStorage" | "db" }
  | { kind: "warm"; seed: PositionMap }
  | { kind: "cold" };

/**
 * Layout precedence, cheapest tier first:
 *   L1 exact — this device's localStorage cache matches the graph hash;
 *   L2 exact — the server-saved layout matches (a returning user on a NEW
 *              device skips FA2 entirely);
 *   L1 warm  — stale local cache with high node coverage seeds a short refine;
 *   L2 warm  — stale server layout with high coverage seeds the same refine;
 *   cold     — deterministic cluster seed + full FA2.
 * An exact DB hit outranks a stale local warm start on purpose: perfect
 * settled positions beat re-running FA2 from an older seed.
 */
export function decideLayout(
  local: CachedLayout | null,
  server: GraphLayoutSnapshot | null | undefined,
  hash: string,
  nodeIds: readonly string[],
): LayoutDecision {
  if (local?.exact) return { kind: "exact", positions: local.positions, source: "localStorage" };

  const fromServer = server ? readServerPositions(server, nodeIds) : null;
  if (fromServer && server?.hash === hash && fromServer.size === nodeIds.length) {
    return { kind: "exact", positions: fromServer, source: "db" };
  }
  if (local) return { kind: "warm", seed: local.positions };
  if (
    fromServer &&
    nodeIds.length > 0 &&
    fromServer.size / nodeIds.length >= GRAPH_WARM_START_MIN_OVERLAP
  ) {
    return { kind: "warm", seed: fromServer };
  }
  return { kind: "cold" };
}

/** Server record → PositionMap holding only nodes present in this graph
 *  (a stale snapshot must never leak positions for deleted nodes). */
function readServerPositions(
  server: GraphLayoutSnapshot,
  nodeIds: readonly string[],
): PositionMap | null {
  const positions: PositionMap = new Map();
  for (const id of nodeIds) {
    const pos = server.positions[id];
    if (pos) positions.set(id, { x: pos[0], y: pos[1] });
  }
  return positions.size > 0 ? positions : null;
}
