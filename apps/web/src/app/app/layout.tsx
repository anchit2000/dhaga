import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedAppNavigation } from "@/lib/cache/app-navigation";
import { getSttEngine } from "@/lib/repo/settings";
import { AppNav } from "@/components/app/AppNav";
import { NavigationFeedback } from "@/components/app/NavigationFeedback";
import { SttEngineProvider } from "@/components/app/contact/SttEngineContext";

export const metadata = { title: "Dhaga" };
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserIdForPage();
  const [[isAdmin, searchWeights], sttEngine] = await Promise.all([
    getCachedAppNavigation(userId),
    getSttEngine(),
  ]);

  return (
    <SttEngineProvider engine={sttEngine}>
      <NavigationFeedback>
        <div className="min-h-dvh bg-ink text-paper">
          <AppNav isAdmin={isAdmin} initialSearchWeights={searchWeights} />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
            {children}
          </main>
        </div>
      </NavigationFeedback>
    </SttEngineProvider>
  );
}
