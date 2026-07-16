import { track } from "@vercel/analytics";
import {
  GRAPH_TIER3_EDGE_TRIPWIRE,
  GRAPH_TIER3_NODE_TRIPWIRE,
} from "@/utils/constants/graph";
import type { LayoutSource } from "./layout-precedence";

export interface GraphLoadStats {
  nodes: number;
  edges: number;
  payloadBytes: number;
  fetchMs: number;
  layoutMs: number;
  /** Boot start → canvas ready. */
  ttiMs: number;
  /** Where the payload came from. */
  source: "idb" | "network";
  /** Which caching tier produced the positions. */
  layoutSource: LayoutSource;
}

/**
 * ONE PII-free perf event per graph load. Counts and timings ONLY — node
 * ids, names, and labels must never reach analytics (contact data is the
 * user's data about third parties; leaking it is a bug, not a metric).
 */
export function reportGraphLoad(stats: GraphLoadStats): void {
  track("graph_load", {
    nodes: stats.nodes,
    edges: stats.edges,
    payloadBytes: stats.payloadBytes,
    fetchMs: Math.round(stats.fetchMs),
    layoutMs: Math.round(stats.layoutMs),
    ttiMs: Math.round(stats.ttiMs),
    source: stats.source,
    layoutSource: stats.layoutSource,
  });
  if (process.env.NODE_ENV === "development") {
    console.info(
      `[graph] nodes=${stats.nodes} edges=${stats.edges} bytes=${stats.payloadBytes} ` +
        `fetch=${Math.round(stats.fetchMs)}ms layout=${Math.round(stats.layoutMs)}ms ` +
        `tti=${Math.round(stats.ttiMs)}ms source=${stats.source} layoutSource=${stats.layoutSource}`,
    );
  }
  if (stats.nodes > GRAPH_TIER3_NODE_TRIPWIRE || stats.edges > GRAPH_TIER3_EDGE_TRIPWIRE) {
    // Tier-3 tripwire: the full-load + client-FA2 architecture is out of
    // headroom at this size — implement the caching-tier PR's Tier-3
    // follow-ups (server-side layout jobs, payload slimming, viewport
    // streaming) before this graph grows further.
    console.warn(
      `[graph] Tier-3 tripwire crossed: ${stats.nodes} nodes / ${stats.edges} edges ` +
        `(thresholds ${GRAPH_TIER3_NODE_TRIPWIRE} / ${GRAPH_TIER3_EDGE_TRIPWIRE}). ` +
        "See the caching-tier PR's Tier-3 follow-ups.",
    );
  }
}
