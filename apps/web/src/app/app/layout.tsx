import { requireSessionPage } from "@/lib/auth/guard";
import { AppNav } from "@/components/app/AppNav";

export const metadata = { title: "Dhaga" };

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionPage();

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
