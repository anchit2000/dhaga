// Dhaga Cloud only — see packages/ee/LICENSE. Self-hosters can delete this
// whole app/admin/** folder; the rest of the app doesn't reference it.
import { requireAdminForPage } from "@/lib/hosted/gate";

export const metadata = { title: "Admin — Dhaga" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminForPage();

  return <div className="space-y-6">{children}</div>;
}
