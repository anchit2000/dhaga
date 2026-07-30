import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedAppConfig } from "@/lib/cache/app-navigation";
import { countPendingConfirmations } from "@/lib/repo/confirmations";
import { getNotificationSummary, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { countUnreadNotifications, listRecentNotifications } from "@/lib/repo/notifications";
import { getImportantDateLeadDays } from "@/lib/repo/suggestion-settings";
import { DataProvider } from "@/lib/data";
import { AppNav } from "@/components/app/AppNav";
import { buildNotificationFeed } from "@/components/app/AppNav/NotificationBell";
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
  const [{ isAdmin, searchWeights }, confirmationsCount, reminders] = await Promise.all([
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
