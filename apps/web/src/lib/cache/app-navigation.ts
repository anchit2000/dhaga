import { unstable_cache, revalidateTag } from "next/cache";
import { withUserDb } from "@/lib/db/request-scope";
import { getAdminGate } from "@/lib/hosted/gate";
import { getSearchWeights } from "@/lib/repo/settings";
import { APP_NAVIGATION_CACHE_KEY } from "@/utils/constants/cache";
import type { SearchWeights } from "@/utils/constants/search";

export function appNavigationTag(userId: string): string {
  return `${APP_NAVIGATION_CACHE_KEY}:${userId}`;
}

export async function getCachedAppNavigation(userId: string): Promise<[boolean, SearchWeights]> {
  return unstable_cache(
    async () => withUserDb(userId, async () => Promise.all([
      (await getAdminGate()).isAdmin(userId),
      getSearchWeights(),
    ])),
    [APP_NAVIGATION_CACHE_KEY, userId],
    { tags: [appNavigationTag(userId)] },
  )();
}

export function invalidateAppNavigation(userId: string): void {
  revalidateTag(appNavigationTag(userId), { expire: 0 });
}
