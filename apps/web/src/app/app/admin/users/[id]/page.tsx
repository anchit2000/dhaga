// Dhaga Cloud only — see packages/ee/LICENSE.
import { notFound } from "next/navigation";
import {
  getUser,
  getSubscription,
  aiCreditsThisMonthFor,
  getAiCapOverrideFor,
  activeGrantedCreditsFor,
  canAdminDowngrade,
} from "@dhaga/ee/admin";
import { isUnlimitedAiSub } from "@dhaga/ee/billing";
import { setUserAdminAction } from "@/lib/actions/admin/users";
import { requireAdminForPage } from "@/lib/hosted/gate";
import { ActionForm } from "@/components/app/ActionForm";
import { SubscriptionControls } from "@/components/app/admin/SubscriptionControls";
import { GrantCard } from "@/components/app/admin/ai-budget/GrantCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminForPage();
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();

  const [subscription, aiCreditsThisMonth, aiCapOverride, grantedCredits] = await Promise.all([
    getSubscription(id),
    aiCreditsThisMonthFor(id),
    getAiCapOverrideFor(id),
    activeGrantedCreditsFor(id),
  ]);

  // Only the per-user override is a number this page can state outright. With no
  // override the ceiling comes from the ladder in lib/ai/metering/cap — plan
  // allowance, or the instance default — and resolving that here would read the
  // ACTING admin's settings, not this user's, so name the rung instead of
  // printing a number that could be wrong. "No AI (free tier)" was that number
  // being wrong: free carries a real allowance now.
  const aiDenominator =
    aiCapOverride !== null
      ? String(aiCapOverride)
      : isUnlimitedAiSub(subscription)
        ? "unlimited"
        : "their plan's monthly allowance";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{user.name}</h1>
        <p className="text-sm text-fog">{user.email}</p>
      </div>

      <div className="rounded-2xl border border-seam bg-panel p-5">
        <p className="text-sm font-medium text-paper">AI usage this month</p>
        <p className="mt-1 text-sm text-fog">
          {aiCreditsThisMonth} credits / {aiDenominator}
        </p>
        {grantedCredits > 0 ? (
          <p className="mt-1 text-sm text-fog">
            <span className="text-ember">+{grantedCredits} granted</span> on top (active
            grants, including instance-wide ones). Usage above is what was actually spent —
            grants never change it.
          </p>
        ) : null}
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

      <SubscriptionControls
        userId={user.id}
        currentPlan={(subscription?.plan ?? "free") as "free" | "pro" | "power"}
        currentExpiry={subscription?.currentPeriodEnd ?? null}
        currentCredits={aiCapOverride}
        // Same predicate the server action enforces, so the form disables what
        // it would refuse instead of offering an option that silently fails.
        canDowngrade={canAdminDowngrade(subscription)}
      />

      <GrantCard userId={user.id} />

      <ActionForm
        action={setUserAdminAction}
        errorMessage="Couldn't update admin access."
        className="rounded-2xl border border-seam bg-panel p-5"
      >
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="isAdmin" value={String(!user.isAdmin)} />
        <p className="text-sm font-medium text-paper">Admin access</p>
        <p className="mt-1 text-sm text-fog">
          {user.isAdmin ? "Can manage users, requests, and billing." : "Regular account."}
        </p>
        <Button type="submit" variant="outline" size="sm" className="mt-3">
          {user.isAdmin ? "Revoke admin" : "Make admin"}
        </Button>
      </ActionForm>
    </div>
  );
}
