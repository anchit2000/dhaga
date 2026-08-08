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
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        {/* No href: there is no founding-seats page to open — the claimed/cap
            pair is the whole story, and it used to be read off /pricing. */}
        <StatCard
          label="Founding seats claimed"
          value={counts.foundingSeatsClaimed}
          caption={`of ${counts.foundingSeatCap}`}
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
      {/* No StatCard: a count would need another dashboardCounts query, and
          feedback is read, not cleared to zero. */}
      <Link
        href="/app/admin/feedback"
        className="mt-4 block rounded-2xl border border-seam bg-panel p-5 transition-colors hover:border-amber/40"
      >
        <p className="text-sm font-medium text-paper">Feedback</p>
        <p className="mt-1 text-sm text-fog">
          What people wrote in from the feedback box, newest first.
        </p>
      </Link>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  caption,
}: {
  href?: string;
  label: string;
  value: number;
  caption?: string;
}) {
  const card = (
    <Card className="border-seam bg-panel transition-colors hover:border-amber/40">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-fog">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-4xl tabular-nums text-paper">{value}</p>
        {caption ? <p className="mt-1 text-xs text-fog">{caption}</p> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
