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

export function cachePerUser<T>(
  key: string,
  userId: string,
  read: () => Promise<T>,
): Promise<T> {
  // The read must be JSON-serializable — unstable_cache serializes results, so
  // a Date field would come back as a string on a cache hit.
  return unstable_cache(
    () => withUserDb(userId, read),
    [key, userId],
    { tags: [perUserTag(key, userId)] },
  )();
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
