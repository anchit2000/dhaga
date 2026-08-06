import { createBillingPortalSessionAction } from "@/lib/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/app/ActionForm";
import { PlanPicker } from "@/components/app/settings/PlanPicker";
import type { PlanSummary } from "@/lib/hosted/gate";

const PLAN_LABEL: Record<PlanSummary["plan"], string> = {
  free: "Free",
  pro: "Pro",
  power: "Power",
};

/** Monthly AI-action allowance for the acting user, as counted by the metering
 *  layer (used vs the effective cap, or unlimited on a paid plan). Absent when
 *  the instance has no LLM configured, so no credits line renders. */
export interface AiUsage {
  used: number;
  cap: number;
  unlimited: boolean;
}

/** Credits row: foregrounds how many AI credits are left this month, mirroring
 *  how metering.ts counts them (used vs cap, unlimited on a paid plan). */
function AiCreditsRow({ used, cap, unlimited }: AiUsage) {
  const remaining = Math.max(0, cap - used);
  return (
    <div className="border-t border-seam pt-4">
      <p className="text-sm font-medium text-paper">AI credits</p>
      {unlimited ? (
        <p className="mt-1 text-sm text-fog">
          <span className="text-paper">Unlimited</span> — {used} AI credits used this month
        </p>
      ) : cap > 0 ? (
        <p className="mt-1 text-sm text-fog">
          <span className="text-ember">{remaining}</span> of {cap} AI credits left this month
        </p>
      ) : (
        <p className="mt-1 text-sm text-fog">Cloud AI is included with a paid plan.</p>
      )}
    </div>
  );
}

/** Only rendered when the settings page's PlanSummary fetch is non-null —
 *  i.e. only on a hosted instance with EE billing active. */
export function BillingSetting({
  summary,
  aiUsage,
  preferred,
}: {
  summary: PlanSummary;
  aiUsage?: AiUsage | null;
  /** Which processor leads, from the request's country. Default keeps the
   *  component usable from surfaces that don't resolve geo. */
  preferred?: "stripe" | "razorpay";
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-paper">Plan & billing</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-fog">
            <Badge variant={summary.plan === "free" ? "secondary" : "default"}>
              {PLAN_LABEL[summary.plan]}
            </Badge>
            {summary.status && summary.status !== "active" ? (
              <span className="text-destructive/90">{summary.status}</span>
            ) : null}
          </p>
        </div>
        {summary.hasStripeCustomer && summary.stripeEnabled ? (
          <ActionForm
            action={createBillingPortalSessionAction}
            errorMessage="Couldn't open billing — please try again."
          >
            <Button type="submit" variant="outline" size="sm">
              Manage billing
            </Button>
          </ActionForm>
        ) : null}
      </div>
      {aiUsage ? <AiCreditsRow {...aiUsage} /> : null}
      {summary.plan === "free" ? (
        <PlanPicker summary={summary} preferred={preferred ?? "stripe"} />
      ) : null}
    </div>
  );
}
