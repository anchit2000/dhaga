import {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
} from "@/lib/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanSummary } from "@/lib/hosted/gate";

const PLAN_LABEL: Record<PlanSummary["plan"], string> = {
  free: "Free",
  pro: "Pro",
  lifetime: "Lifetime",
};

/** Only rendered when the settings page's PlanSummary fetch is non-null —
 *  i.e. only on a hosted instance with EE billing active. */
export function BillingSetting({ summary }: { summary: PlanSummary }) {
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
              <span className="text-red-400/90">{summary.status}</span>
            ) : null}
          </p>
        </div>
        {summary.hasStripeCustomer ? (
          <form action={createBillingPortalSessionAction}>
            <Button type="submit" variant="outline" size="sm">
              Manage billing
            </Button>
          </form>
        ) : null}
      </div>
      {summary.plan === "free" ? (
        <div className="flex flex-wrap gap-2 border-t border-seam pt-4">
          <form action={createCheckoutSessionAction}>
            <input type="hidden" name="plan" value="pro" />
            <Button type="submit" size="sm">
              Go Pro
            </Button>
          </form>
          <form action={createCheckoutSessionAction}>
            <input type="hidden" name="plan" value="lifetime" />
            <Button type="submit" variant="outline" size="sm">
              Buy Lifetime
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
