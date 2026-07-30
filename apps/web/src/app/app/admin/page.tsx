// Dhaga Cloud only — see packages/ee/LICENSE.
import Link from "next/link";
import { dashboardCounts } from "@dhaga/ee/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminForPage } from "@/lib/hosted/gate";

export default async function AdminDashboardPage() {
  await requireAdminForPage();
  const counts = await dashboardCounts();

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight">Admin</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          href="/app/admin/access-requests"
          label="Pending access requests"
          value={counts.pendingAccessRequests}
        />
        <StatCard href="/app/admin/users" label="Total users" value={counts.totalUsers} />
        <StatCard
          href="/app/admin/subscriptions"
          label="Active subscriptions"
          value={counts.activeSubscriptions}
        />
      </div>
      <Link
        href="/app/admin/ai-credits"
        className="mt-4 block rounded-2xl border border-seam bg-panel p-5 transition-colors hover:border-amber/40"
      >
        <p className="text-sm font-medium text-paper">AI credits</p>
        <p className="mt-1 text-sm text-fog">
          Plan allowances, a promotional month, and make-good grants.
        </p>
      </Link>
    </div>
  );
}

function StatCard({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href}>
      <Card className="border-seam bg-panel transition-colors hover:border-amber/40">
        <CardHeader>
          <CardTitle className="text-sm font-normal text-fog">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display text-4xl tabular-nums text-paper">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
