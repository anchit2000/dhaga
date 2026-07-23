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
