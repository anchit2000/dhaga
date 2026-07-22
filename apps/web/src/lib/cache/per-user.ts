import { unstable_cache, revalidateTag } from "next/cache";
import { withUserDb } from "@/lib/db/request-scope";

/**
 * Per-user, mutation-invalidated caching over a scoped read (BRD §7.6:
 * authenticated /app/* navigation must not re-run the full Postgres query set
 * on every click).
 *
 * Both the cache key and the tag include userId, and the read runs inside
 * `withUserDb(userId, ...)` — so a cache entry can only ever hold *that* user's
 * data. A missed invalidation therefore causes at worst same-user staleness,
 * never cross-tenant leakage; there is no TTL, entries live until a mutation
 * busts the tag.
 */
export function perUserTag(key: string, userId: string): string {
  return `${key}:${userId}`;
}

/**
 * Runs `read` through Next's data cache. When that cache isn't available —
 * i.e. called outside a Next request (a unit test, a script, a background job),
 * where `unstable_cache` throws an "incrementalCache missing" invariant — it
 * degrades to a direct scoped read: correctness is preserved, only the caching
 * is skipped (fail-open on a perf optimization). The read must be
 * JSON-serializable — unstable_cache serializes results, so a Date field would
 * come back as a string on a cache hit.
 */
async function cached<T>(
  keyParts: string[],
  tag: string,
  userId: string,
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await unstable_cache(() => withUserDb(userId, read), keyParts, { tags: [tag] })();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return withUserDb(userId, read);
    }
    throw error;
  }
}

export function cachePerUser<T>(
  key: string,
  userId: string,
  read: () => Promise<T>,
): Promise<T> {
  return cached([key, userId], perUserTag(key, userId), userId, read);
}

/**
 * Version-keyed variant for hot reads too broad to invalidate by hand (the
 * whole graph, dashboard feeds). `version` is a cheap per-user hash of the
 * underlying data (e.g. `fetchGraphVersion()`); folding it into the cache key
 * means a write that changes the data changes the key, so the next read is
 * automatically a miss — no explicit invalidation, and a stale payload is
 * impossible. Pair it with a version query that is far cheaper than the read
 * it guards, or the caching earns nothing.
 */
export function cachePerUserVersioned<T>(
  key: string,
  userId: string,
  version: string,
  read: () => Promise<T>,
): Promise<T> {
  return cached([key, userId, version], perUserTag(key, userId), userId, read);
}

/**
 * Immediate invalidation (`{ expire: 0 }`) so the next read re-runs the query —
 * never a TTL, since these entries hold RLS-scoped per-tenant data. Call only
 * from a Server Action or Route Handler, never during render or inside a cached
 * function (Next throws in those contexts).
 */
export function invalidatePerUser(key: string, userId: string): void {
  revalidateTag(perUserTag(key, userId), { expire: 0 });
}
