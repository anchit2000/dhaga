import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { setPlanCapEnforcementAction } from "@/lib/actions/admin/ai-budget";
import type { ReactElement } from "react";

/**
 * The master switch. ON is the shipped default, so the copy's job has flipped:
 * the ON state describes normal operation, and the OFF state is the one that has
 * to say loudly what has been given up — every plan's allowance stops applying
 * and paid users fall back to their raw billing entitlement.
 */
export function EnforcementCard({ enabled }: { enabled: boolean }): ReactElement {
  return (
    <ActionForm
      action={setPlanCapEnforcementAction}
      errorMessage="Couldn't change plan-cap enforcement."
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
    >
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-paper">Plan-cap enforcement</p>
        <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
      </div>
      {enabled ? (
        <p className="text-sm text-fog">
          <span className="text-paper">Limits are being enforced</span> — the shipped
          default. Every user is held to the monthly allowance for their plan, below:
          Free and Pro have a number, Lifetime / Annual has no cap. This is what the
          pricing page states, so leave it on unless you have a reason not to.
        </p>
      ) : (
        <p className="text-sm text-fog">
          <span className="text-ember">Limits are not being enforced.</span> You have
          turned off the shipped default. The allowances below are stored but ignored:
          every plan resolves through its raw billing entitlement instead, and users with
          no plan fall back to the instance default. The pricing page still states a
          monthly allowance per plan, so this is a temporary escape hatch — a migration or
          an incident — not a setting to leave here.
        </p>
      )}
      <p className="text-sm text-fog">
        Promotions and grants below work either way — they don&rsquo;t need this switch.
      </p>
      <SubmitButton className="w-full sm:w-auto">
        {enabled ? "Stop enforcing plan caps" : "Start enforcing plan caps"}
      </SubmitButton>
    </ActionForm>
  );
}
