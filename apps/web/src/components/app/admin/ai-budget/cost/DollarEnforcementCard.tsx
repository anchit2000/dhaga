// Dhaga Cloud only — see packages/ee/LICENSE.
import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { setDollarCapEnforcementAction } from "@/lib/actions/admin/ai-dollar-cap";
import type { ReactElement } from "react";

/**
 * The master switch for the dollar gate — same shape as the credit ladder's
 * EnforcementCard, so an operator meets one pattern rather than two.
 *
 * ON is the shipped default: a cost backstop that ships off is not a backstop,
 * and three metered features cost 0 credits, so with this off nothing bounds
 * their spend at all. The switch exists for an incident, not as a resting state.
 */
export function DollarEnforcementCard({ enabled }: { enabled: boolean }): ReactElement {
  return (
    <ActionForm
      action={setDollarCapEnforcementAction}
      errorMessage="Couldn't change AI spending-ceiling enforcement."
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
    >
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-paper">AI spending-ceiling enforcement</p>
        <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
      </div>
      {enabled ? (
        <p className="text-sm text-fog">
          <span className="text-paper">The dollar ceiling is being enforced</span> — the
          shipped default. Every AI action is checked against the user&rsquo;s monthly
          inference-dollar ceiling, including the actions that cost 0 credits.
        </p>
      ) : (
        <p className="text-sm text-fog">
          <span className="text-ember">The dollar ceiling is not being enforced.</span>{" "}
          Nothing bounds what a month of AI can cost per user except the credit allowance
          — which by design cannot see watchlist scans, contact checks or goal matches. A
          temporary escape hatch, not a setting to leave here.
        </p>
      )}
      <p className="text-sm text-fog">
        A per-user dollar override still applies either way, the same way a per-user
        credit override does.
      </p>
      <SubmitButton className="w-full sm:w-auto">
        {enabled ? "Stop enforcing the dollar ceiling" : "Start enforcing the dollar ceiling"}
      </SubmitButton>
    </ActionForm>
  );
}
