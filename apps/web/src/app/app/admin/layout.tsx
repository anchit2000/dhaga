// Dhaga Cloud only — see packages/ee/LICENSE. Self-hosters can delete this
// whole app/admin/** folder; the rest of the app doesn't reference it.
import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getAdminGate } from "@/lib/hosted/gate";

export const metadata = { title: "Admin — Dhaga" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserIdForPage();
  const isAdmin = await (await getAdminGate()).isAdmin(userId);
  // 404, not a redirect — a non-admin shouldn't be able to distinguish
  // "doesn't exist" from "exists but you're blocked".
  if (!isAdmin) notFound();

  return <div className="space-y-6">{children}</div>;
}
