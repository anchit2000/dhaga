import { createBillingPortalSessionAction } from "@/lib/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/app/ActionForm";
import { PlanPicker } from "@/components/app/settings/PlanPicker";
import { PlanActions } from "@/components/app/settings/PlanActions";
import { CADENCE_LABEL, TIER_LABEL } from "@/utils/constants/pricing";
import { formatDate } from "@/utils/format-date";
import type { CurrentPlanState, FoundingOffer, PlanSummary } from "@/lib/hosted/gate";

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

/**
 * One sentence for what the customer is on and what happens next. A booked
 * change has to be visible here — "Power until 3 Mar, then Pro" — or a customer
 * who scheduled a downgrade sees only "Power" and reasonably assumes it didn't
 * take.
 */
function PlanStatusLine({ plan, current }: { plan: PlanSummary["plan"]; current: CurrentPlanState }) {
  const cadence = current.cadence ? CADENCE_LABEL[current.cadence].toLowerCase() : null;
  const renews = current.renewsAt ? formatDate(current.renewsAt) : null;

  if (current.pending) {
    return (
      <p className="text-sm text-fog">
        {PLAN_LABEL[plan]}
        {renews ? ` until ${renews}` : ""}, then{" "}
        <span className="text-paper">
          {TIER_LABEL[current.pending.plan]} {CADENCE_LABEL[current.pending.cadence].toLowerCase()}
        </span>
        .
      </p>
    );
  }
  if (current.cancelAtPeriodEnd) {
    return <p className="text-sm text-fog">Cancels{renews ? ` on ${renews}` : " at renewal"}.</p>;
  }
  return (
    <p className="text-sm text-fog">
      {cadence ? `Billed ${cadence}` : "Recurring"}
      {renews ? `, renews ${renews}` : ""}.
    </p>
  );
}

/**
 * Plan details are read from our own row, not live from Stripe/Razorpay — that
 * is what keeps an entitlement check off the payment API. The trade is a copy
 * that can drift, so the drift is shown rather than hidden: this page
 * reconciles on every load, and this line says when that last succeeded.
 */
function SyncLine({ syncedAt }: { syncedAt: Date | null }) {
  return (
    <p className="text-xs text-fog/70">
      {syncedAt
        ? `Plan details confirmed with the payment processor on ${formatDate(syncedAt)}.`
        : "Plan details not yet confirmed with the payment processor."}
    </p>
  );
}

/** Only rendered when the settings page's PlanSummary fetch is non-null —
 *  i.e. only on a hosted instance with EE billing active. */
export function BillingSetting({
  summary,
  aiUsage,
  preferred,
  founding,
}: {
  summary: PlanSummary;
  aiUsage?: AiUsage | null;
  /** Which processor leads, from the request's country. Default keeps the
   *  component usable from surfaces that don't resolve geo. */
  preferred?: "stripe" | "razorpay";
  /** Founding Pro while seats remain, else null — the gate decides, not this. */
  founding?: FoundingOffer | null;
}) {
  const current = summary.current;
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-paper">Plan & billing</p>
          <p className="flex items-center gap-2 text-sm text-fog">
            <Badge variant={summary.plan === "free" ? "secondary" : "default"}>
              {PLAN_LABEL[summary.plan]}
            </Badge>
            {summary.status && summary.status !== "active" ? (
              <span className="text-destructive/90">{summary.status}</span>
            ) : null}
          </p>
          {current ? <PlanStatusLine plan={summary.plan} current={current} /> : null}
        </div>
        {summary.hasStripeCustomer && summary.stripeEnabled ? (
          <ActionForm
            action={createBillingPortalSessionAction}
            errorMessage="Couldn't open billing — please try again."
          >
            <Button type="submit" variant="outline" size="sm">
              Invoices & card
            </Button>
          </ActionForm>
        ) : null}
      </div>
      {aiUsage ? <AiCreditsRow {...aiUsage} /> : null}
      {/* Rendered on EVERY plan, not just free: a subscriber changes tier or
          cadence through the same surface, and each button there modifies the
          subscription in place rather than opening a second checkout. */}
      <PlanPicker summary={summary} preferred={preferred ?? "stripe"} founding={founding} />
      {current ? (
        <div className="space-y-3 border-t border-seam pt-4">
          <PlanActions current={current} />
          <SyncLine syncedAt={current.syncedAt} />
        </div>
      ) : null}
    </div>
  );
}
