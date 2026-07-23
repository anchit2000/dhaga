// Dhaga Cloud only — see packages/ee/LICENSE.
import { notFound } from "next/navigation";
import { getUser, getSubscription, aiActionsThisMonthFor } from "@dhaga/ee/admin";
import { setUserAdminAction } from "@/lib/actions/admin/users";
import { requireAdminForPage } from "@/lib/hosted/gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FREE_TIER_AI_ACTIONS_PER_MONTH } from "@/utils/constants/app";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminForPage();
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();

  const [subscription, aiActionsThisMonth] = await Promise.all([
    getSubscription(id),
    aiActionsThisMonthFor(id),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{user.name}</h1>
        <p className="text-sm text-fog">{user.email}</p>
      </div>

      <div className="rounded-2xl border border-seam bg-panel p-5">
        <p className="text-sm font-medium text-paper">AI usage this month</p>
        <p className="mt-1 text-sm text-fog">
          {aiActionsThisMonth} / {subscription ? "unlimited" : FREE_TIER_AI_ACTIONS_PER_MONTH}
        </p>
      </div>

      <div className="rounded-2xl border border-seam bg-panel p-5">
        <p className="text-sm font-medium text-paper">Subscription</p>
        {subscription ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-fog">
            <Badge>{subscription.plan}</Badge>
            <Badge variant="secondary">{subscription.status}</Badge>
            {subscription.currentPeriodEnd ? (
              <span>renews {subscription.currentPeriodEnd.toLocaleDateString()}</span>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-fog">Free tier — no subscription.</p>
        )}
      </div>

      <form action={setUserAdminAction} className="rounded-2xl border border-seam bg-panel p-5">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="isAdmin" value={String(!user.isAdmin)} />
        <p className="text-sm font-medium text-paper">Admin access</p>
        <p className="mt-1 text-sm text-fog">
          {user.isAdmin ? "Can manage users, requests, and billing." : "Regular account."}
        </p>
        <Button type="submit" variant="outline" size="sm" className="mt-3">
          {user.isAdmin ? "Revoke admin" : "Make admin"}
        </Button>
      </form>
    </div>
  );
}
