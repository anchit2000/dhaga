import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedAppConfig } from "@/lib/cache/app-navigation";
import { countPendingConfirmations } from "@/lib/repo/confirmations";
import { getNotificationSummary, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { countUnreadNotifications, listRecentNotifications } from "@/lib/repo/notifications";
import { getImportantDateLeadDays } from "@/lib/repo/suggestion-settings";
import { DataProvider } from "@/lib/data";
import { AppNav } from "@/components/app/AppNav";
import { AppThemeStyle } from "@/components/app/AppThemeStyle";
import { buildNotificationFeed } from "@/components/app/AppNav/NotificationBell";
import { DEFAULT_UI_THEME } from "@/utils/constants/theme";
import { BusyOverlayProvider } from "@/components/app/BusyOverlay";
import { NavigationFeedback } from "@/components/app/NavigationFeedback";

export const metadata = { title: "Dhaga" };
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserIdForPage();
  const [{ isAdmin, searchWeights, uiTheme }, confirmationsCount, reminders] = await Promise.all([
    getCachedAppConfig(userId),
    countPendingConfirmations(),
    getNotificationSummary(),
  ]);
  // SEQUENTIAL, deliberately NOT folded into the Promise.all above: the tenant
  // pool tops out at 3 connections and the block already sits at that ceiling
  // (see the pool-exhaustion regressions in lib/db/request-scope). Each await
  // reuses the request-scoped connection; adding them as concurrent reads would
  // not.
  const leadDays = await getImportantDateLeadDays();
  const importantDates = await listUpcomingImportantDates(leadDays);
  const notifications = await listRecentNotifications();
  const unreadNotifications = await countUnreadNotifications();
  const notificationFeed = buildNotificationFeed({
    reminders,
    importantDates,
    notifications,
    unreadNotifications,
  });

  return (
    <DataProvider>
      {/* Mounted HERE and not in the root layout: that is what scopes user
          theming to /app/**. The marketing pages, /blog and /docs render
          statically off the stock brand tokens and must stay that way — one
          user's palette is not the product's identity. First in the tree so the
          override is parsed before the markup it repaints. */}
      {/* Falls back to default rather than trusting uiTheme is always present:
          getCachedAppConfig is wrapped in a per-user cache with no TTL, so its
          return shape can lag behind a deploy that adds a field to AppConfig —
          a still-warm entry from before uiTheme existed comes back without it.
          This must never 500 the whole /app shell over a stale cached field. */}
      <AppThemeStyle theme={uiTheme ?? DEFAULT_UI_THEME} />
      {/* Above every page Suspense boundary on purpose — see BusyOverlay. */}
      <BusyOverlayProvider>
        <NavigationFeedback>
          <div className="min-h-dvh bg-ink text-paper">
            <AppNav
              isAdmin={isAdmin}
              initialSearchWeights={searchWeights}
              confirmationsCount={confirmationsCount}
              notificationFeed={notificationFeed}
            />
            <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
              {children}
            </main>
          </div>
        </NavigationFeedback>
      </BusyOverlayProvider>
    </DataProvider>
  );
}
