import { cachePerUser, invalidatePerUser } from "./per-user";
import { listNodeTypes } from "@/lib/repo/node-types";
import { NODE_TYPES_CACHE_KEY } from "@/utils/constants/cache";

/**
 * The node-type ontology, read on every /app navigation that renders it (home,
 * entities). It changes only through the node-type mutations, so caching it
 * per user turns those repeat reads into zero-DB cache hits.
 *
 * Projected to a JSON-safe shape: NodeTypeRow carries a createdAt Date that
 * would deserialize to a string on a cache hit, and no consumer needs it —
 * every caller already narrows to a subset of these fields.
 */
export interface CachedNodeType {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function getCachedNodeTypes(userId: string): Promise<CachedNodeType[]> {
  return cachePerUser(NODE_TYPES_CACHE_KEY, userId, async () =>
    (await listNodeTypes()).map(({ id, name, slug, color }) => ({ id, name, slug, color })),
  );
}

export function invalidateNodeTypes(userId: string): void {
  invalidatePerUser(NODE_TYPES_CACHE_KEY, userId);
}
