import { cachePerUserVersioned } from "./per-user";
import { fetchFullGraph } from "@/lib/repo/graph-data";
import { GRAPH_FULL_CACHE_KEY } from "@/utils/constants/cache";
import type { FullGraphPayload } from "@/lib/repo/graph-data";

/**
 * The whole-graph payload for `/api/graph/full`, the single heaviest read in
 * the app (a handful of set-based queries over every node/edge). Cached per
 * (user, graph version): `fetchGraphVersion()` is one cheap aggregate
 * round-trip, so when it's unchanged the multi-table assembly is served from
 * cache instead of re-querying Postgres. Version-keyed, so any write that
 * changes the graph changes the key — no explicit invalidation, never a stale
 * payload. The payload is already JSON (the route `Response.json`s it), so
 * unstable_cache's serialization is a no-op round-trip.
 */
export function getCachedFullGraph(userId: string, version: string): Promise<FullGraphPayload> {
  return cachePerUserVersioned(GRAPH_FULL_CACHE_KEY, userId, version, fetchFullGraph);
}
