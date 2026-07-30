import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { setPlanAllowancesAction } from "@/lib/actions/admin/ai-budget";
import {
  AI_ALLOWANCE_PLANS,
  AI_ALLOWANCE_PLAN_LABELS,
  DEFAULT_AI_PLAN_ALLOWANCES,
  type AiAllowancePlan,
} from "@/utils/constants/ai-budget";
import type { AiPlanAllowances } from "@/types";
import type { ReactElement } from "react";

function defaultLabel(plan: AiAllowancePlan): string {
  const value = DEFAULT_AI_PLAN_ALLOWANCES[plan];
  return value === null ? "no cap" : `${value} credits`;
}

function modeOf(plan: AiAllowancePlan, allowances: AiPlanAllowances): string {
  if (!(plan in allowances)) return "default";
  return allowances[plan] === null ? "nocap" : "custom";
}

/**
 * The credit ladder. The constants in utils/constants/plans.ts are the
 * DEFAULTS; anything set here wins at runtime. Inert until plan-cap enforcement
 * is on — the card above says so.
 */
export function PlanAllowanceCard({
  allowances,
  enforced,
}: {
  allowances: AiPlanAllowances;
  enforced: boolean;
}): ReactElement {
  return (
    <ActionForm
      action={setPlanAllowancesAction}
      errorMessage="Couldn't save the plan allowances."
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
    >
      <div>
        <p className="text-sm font-medium text-paper">Monthly allowance per plan</p>
        <p className="mt-1 text-sm text-fog">
          Credits a plan gets each month. &ldquo;Use default&rdquo; falls back to the
          shipped number in code.{" "}
          {enforced ? "These are live." : "Stored but not applied while enforcement is off."}
        </p>
      </div>

      {AI_ALLOWANCE_PLANS.map((plan) => (
        <div key={plan} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`mode_${plan}`}>
              {AI_ALLOWANCE_PLAN_LABELS[plan]}{" "}
              <span className="text-fog">— default {defaultLabel(plan)}</span>
            </Label>
            <Select id={`mode_${plan}`} name={`mode_${plan}`} defaultValue={modeOf(plan, allowances)}>
              <option value="default">Use default ({defaultLabel(plan)})</option>
              <option value="custom">Custom monthly credits</option>
              <option value="nocap">No cap</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`credits_${plan}`}>Credits</Label>
            <Input
              id={`credits_${plan}`}
              name={`credits_${plan}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={allowances[plan] ?? ""}
              placeholder={String(DEFAULT_AI_PLAN_ALLOWANCES[plan] ?? "")}
              className="h-11 sm:w-32"
            />
          </div>
        </div>
      ))}

      <SubmitButton className="w-full sm:w-auto">Save allowances</SubmitButton>
    </ActionForm>
  );
}
