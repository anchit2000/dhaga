import {
  GRAPH_POSITIONS_MAX_BYTES,
  GRAPH_POSITIONS_STORAGE_KEY,
  GRAPH_WARM_START_MIN_OVERLAP,
} from "@/utils/constants/graph";
import type { FullGraphEdge, FullGraphNode, PositionMap } from "../types";

/** Minimal Storage surface so the cache is testable without a DOM. */
export type PositionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface CacheShape {
  hash: string;
  positions: Record<string, [number, number]>;
}

/**
 * FNV-1a over sorted node + edge ids. Same graph → same hash → the 6-15s FA2
 * pass is skipped entirely on revisit; any added/removed node or edge changes
 * the hash so a stale layout is never silently trusted as final.
 */
export function graphHash(
  nodes: readonly FullGraphNode[],
  edges: readonly FullGraphEdge[],
): string {
  const ids = [...nodes.map((n) => n.id), "|", ...edges.map((e) => e.id)].sort();
  let hash = 0x811c9dc5;
  for (const id of ids) {
    for (let i = 0; i < id.length; i += 1) {
      hash ^= id.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0x2c; // id separator so ["ab","c"] ≠ ["a","bc"]
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export interface CachedLayout {
  positions: PositionMap;
  /** True when the cache hash matches the current graph — layout can be skipped. */
  exact: boolean;
}

/**
 * A stale cache still beats a cold start: when most nodes are covered we
 * reuse it as a warm start (new nodes get placed at neighbours' centroid and
 * a short refine pass runs) instead of paying a full layout.
 */
export function loadPositionCache(
  store: PositionStore,
  hash: string,
  nodeIds: readonly string[],
): CachedLayout | null {
  let parsed: CacheShape;
  try {
    const raw = store.getItem(GRAPH_POSITIONS_STORAGE_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw) as CacheShape;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.positions) return null;

  const positions: PositionMap = new Map();
  for (const id of nodeIds) {
    const pos = parsed.positions[id];
    if (pos) positions.set(id, { x: pos[0], y: pos[1] });
  }
  if (parsed.hash === hash && positions.size === nodeIds.length) {
    return { positions, exact: true };
  }
  if (nodeIds.length > 0 && positions.size / nodeIds.length >= GRAPH_WARM_START_MIN_OVERLAP) {
    return { positions, exact: false };
  }
  return null;
}

/** PositionMap → JSON-safe record rounded to 2dp (sub-pixel precision is
 *  noise); shared by the localStorage cache and the server upload (layout-sync). */
export function toPositionRecord(positions: PositionMap): Record<string, [number, number]> {
  const record: Record<string, [number, number]> = {};
  for (const [id, pos] of positions) {
    record[id] = [Math.round(pos.x * 100) / 100, Math.round(pos.y * 100) / 100];
  }
  return record;
}

/** Persist a settled layout; degrade gracefully when it won't fit in localStorage. */
export function savePositionCache(
  store: PositionStore,
  hash: string,
  positions: PositionMap,
): boolean {
  const serialized = JSON.stringify({ hash, positions: toPositionRecord(positions) } satisfies CacheShape);
  if (serialized.length > GRAPH_POSITIONS_MAX_BYTES) {
    try {
      store.removeItem(GRAPH_POSITIONS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    store.setItem(GRAPH_POSITIONS_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false; // quota exceeded — layout still works, just uncached
  }
}
