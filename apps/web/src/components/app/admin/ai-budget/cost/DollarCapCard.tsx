// Dhaga Cloud only — see packages/ee/LICENSE.
import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setDollarCapLimitsAction } from "@/lib/actions/admin/ai-dollar-cap";
import { ceilingForPlanRevenue } from "@/lib/ai/metering";
import {
  AI_ALLOWANCE_PLAN_LABELS,
  AI_ALLOWANCE_PLANS,
  PLAN_MONTHLY_REVENUE_USD,
} from "@/utils/constants/ai-budget";
import { formatUsd } from "./labels";
import type { AiDollarCapConfig } from "@/types";
import type { ReactElement } from "react";

/**
 * The master cost gate's controls. Credits bound what a user may DO; this bounds
 * what their month may COST us — the two are independent ceilings, and only this
 * one can see the three features priced at 0 credits.
 *
 * The per-plan table is computed with the SAME function the gate enforces with
 * (`ceilingForPlanRevenue`), so what an operator reads here cannot drift from
 * what actually happens.
 */
export function DollarCapCard({ config }: { config: AiDollarCapConfig }): ReactElement {
  return (
    <ActionForm
      action={setDollarCapLimitsAction}
      errorMessage="Couldn't save the AI spending ceiling."
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-paper">Monthly AI spending ceiling</p>
        <Badge variant={config.enforced ? "default" : "secondary"}>
          {config.enforced ? "On" : "Off"}
        </Badge>
      </div>
      <p className="text-sm text-fog">
        A per-user ceiling in real inference dollars, enforced before every AI action —
        including the three that cost 0 credits (watchlist scans, contact checks, goal
        matches), which the credit allowance cannot see at all. Credits and dollars are
        independent: a user can hit either first, and credits are checked first so an
        upgradeable message wins when both apply.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="multiplier">Multiplier on plan revenue</Label>
          <Input
            id="multiplier"
            name="multiplier"
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            defaultValue={config.multiplier}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="floorUsd">Ceiling for $0-revenue plans (USD)</Label>
          <Input
            id="floorUsd"
            name="floorUsd"
            type="number"
            min={0}
            step={0.05}
            inputMode="decimal"
            defaultValue={config.floorUsd}
            className="h-11"
          />
        </div>
      </div>
      <p className="text-sm text-fog">
        Free earns $0 a month, so a multiplier of anything gives it a $0 ceiling and
        would refuse every AI action a free user takes — including the ten their credit
        allowance is meant to buy. Plans with no recurring revenue therefore use the flat
        figure instead.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fog">
            <tr>
              <th className="py-1 text-left font-normal">Plan</th>
              <th className="py-1 text-right font-normal">Revenue / mo</th>
              <th className="py-1 text-right font-normal">Ceiling</th>
            </tr>
          </thead>
          <tbody className="text-paper">
            {AI_ALLOWANCE_PLANS.map((plan) => {
              const revenue = PLAN_MONTHLY_REVENUE_USD[plan];
              const ceiling = ceilingForPlanRevenue(revenue, config.multiplier, config.floorUsd);
              return (
                <tr key={plan} className="border-t border-seam">
                  <td className="py-1.5">{AI_ALLOWANCE_PLAN_LABELS[plan]}</td>
                  <td className="py-1.5 text-right">{formatUsd(revenue)}</td>
                  <td className="py-1.5 text-right">
                    {formatUsd(ceiling.usd ?? 0)}
                    {ceiling.source === "floor" ? <span className="text-fog"> (flat)</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-fog">
        A per-user override outranks all of this, exactly as it does for credits. A
        self-hosted instance with no billing gets no dollar ceiling at all — the operator
        pays their own provider bill.
      </p>

      <SubmitButton className="w-full sm:w-auto">Save ceiling</SubmitButton>
    </ActionForm>
  );
}
