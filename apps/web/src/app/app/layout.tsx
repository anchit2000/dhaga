import { requireUserIdForPage } from "@/lib/auth/guard";
import { getAdminGate } from "@/lib/hosted/gate";
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
  const isAdmin = await (await getAdminGate()).isAdmin(userId);

  return (
    <NavigationFeedback>
      <div className="min-h-dvh bg-ink text-paper">
        <AppNav isAdmin={isAdmin} />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </NavigationFeedback>
  );
}
