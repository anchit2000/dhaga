import { cachePerUser, invalidatePerUser, perUserTag } from "./per-user";
import { getAdminGate } from "@/lib/hosted/gate";
import { getSearchWeights, getSttEngine, shouldStoreCardPhotos } from "@/lib/repo/settings";
import { APP_NAVIGATION_CACHE_KEY } from "@/utils/constants/cache";
import type { SttEngine } from "@/lib/repo/settings";
import type { SearchWeights } from "@/utils/constants/search";

/**
 * Stable per-user config read on the app shell and heavy landing pages. The
 * layout renders on every /app navigation (it is force-dynamic), so keeping
 * this cached means switching pages costs zero Postgres round-trips for the
 * shell — the query set only re-runs when a settings mutation busts the tag.
 * Volatile feed data (due reach-outs, signals, …) is deliberately left live.
 */
export interface AppConfig {
  isAdmin: boolean;
  searchWeights: SearchWeights;
  sttEngine: SttEngine;
  storeCardPhotos: boolean;
}

export function appNavigationTag(userId: string): string {
  return perUserTag(APP_NAVIGATION_CACHE_KEY, userId);
}

export function getCachedAppConfig(userId: string): Promise<AppConfig> {
  return cachePerUser(APP_NAVIGATION_CACHE_KEY, userId, async () => {
    const [isAdmin, searchWeights, sttEngine, storeCardPhotos] = await Promise.all([
      (await getAdminGate()).isAdmin(userId),
      getSearchWeights(),
      getSttEngine(),
      shouldStoreCardPhotos(),
    ]);
    return { isAdmin, searchWeights, sttEngine, storeCardPhotos };
  });
}

export function invalidateAppNavigation(userId: string): void {
  invalidatePerUser(APP_NAVIGATION_CACHE_KEY, userId);
}
