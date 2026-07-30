import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedAppConfig } from "@/lib/cache/app-navigation";
import { countPendingConfirmations } from "@/lib/repo/confirmations";
import { getNotificationSummary } from "@/lib/repo/reminders";
import { DataProvider } from "@/lib/data";
import { AppNav } from "@/components/app/AppNav";
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
  const [{ isAdmin, searchWeights }, confirmationsCount, notificationSummary] =
    await Promise.all([
      getCachedAppConfig(userId),
      countPendingConfirmations(),
      getNotificationSummary(),
    ]);

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
              notificationSummary={notificationSummary}
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
