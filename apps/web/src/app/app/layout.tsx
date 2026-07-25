import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedAppConfig } from "@/lib/cache/app-navigation";
import { countPendingConfirmations } from "@/lib/repo/confirmations";
import { DataProvider } from "@/lib/data";
import { AppNav } from "@/components/app/AppNav";
import { NavigationFeedback } from "@/components/app/NavigationFeedback";

export const metadata = { title: "Dhaga" };
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserIdForPage();
  const [{ isAdmin, searchWeights }, confirmationsCount] = await Promise.all([
    getCachedAppConfig(userId),
    countPendingConfirmations(),
  ]);

  return (
    <DataProvider>
      <NavigationFeedback>
        <div className="min-h-dvh bg-ink text-paper">
          <AppNav
            isAdmin={isAdmin}
            initialSearchWeights={searchWeights}
            confirmationsCount={confirmationsCount}
          />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
            {children}
          </main>
        </div>
      </NavigationFeedback>
    </DataProvider>
  );
}
