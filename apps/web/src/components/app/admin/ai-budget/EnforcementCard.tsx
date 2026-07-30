import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { setPlanCapEnforcementAction } from "@/lib/actions/admin/ai-budget";
import type { ReactElement } from "react";

/**
 * The master switch. Its copy is the point: an admin must be able to see, in one
 * glance, that the allowances below are inert and WHY turning them on is a
 * pricing decision — the pricing page sells Pro and Annual as "no monthly cap".
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
          <span className="text-ember">Limits are being enforced.</span> Every paid user is
          now held to the monthly allowance for their plan, below. The pricing page still
          says Pro and Annual have{" "}
          <span className="text-paper">no monthly cap</span> — change that copy, or turn
          this back off.
        </p>
      ) : (
        <p className="text-sm text-fog">
          <span className="text-paper">Limits are not being enforced.</span> The allowances
          below are stored but ignored: paid plans bypass the cap entirely, exactly as they
          do today, and the pricing page sells Pro and Annual as{" "}
          <span className="text-paper">&ldquo;no monthly cap&rdquo;</span>. Turning this on
          gives every existing paying customer a ceiling they were never sold — a pricing
          decision, not a metering one.
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
