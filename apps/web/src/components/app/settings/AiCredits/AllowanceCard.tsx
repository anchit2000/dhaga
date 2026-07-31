import { formatDate } from "@/utils/format-date";
import { creditsLabel } from "./format";
import type { AiCreditAllowance } from "@/types";

/** One line of the "why is my allowance this number" breakdown. */
function AllowanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-fog">{label}</span>
      <span className="shrink-0 tabular-nums text-paper">{value}</span>
    </div>
  );
}

/**
 * The headline: how much is left, out of how much, and when it comes back.
 *
 * The allowance is decomposed whenever something has been ADDED to it (a
 * make-good grant, a running promotion). A user who is handed a bigger number
 * than their plan sells must be able to see where it came from — an unexplained
 * larger number is indistinguishable from a bug.
 *
 * Carries the onboarding tour's `credits` anchor.
 */
export function AllowanceCard({ allowance }: { allowance: AiCreditAllowance }) {
  const { used, cap, remaining, unlimited, base, granted, promotionCredits, resetsAt } = allowance;
  const percentUsed = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const explained = !unlimited && (granted > 0 || promotionCredits !== null);

  return (
    <section
      data-tour="credits"
      className="scroll-mt-20 space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-paper">Credits this month</p>
        <p className="text-xs text-fog">Resets {formatDate(resetsAt)}</p>
      </div>

      {unlimited ? (
        <>
          <p className="font-display text-3xl tracking-tight text-paper">Unlimited</p>
          <p className="text-sm text-fog">
            Your plan has no monthly credit cap. You have used {creditsLabel(used)} so far this
            month.
          </p>
        </>
      ) : cap > 0 ? (
        <>
          <p className="font-display text-3xl tracking-tight text-fog">
            <span className="text-ember">{remaining}</span> of {cap}
          </p>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-seam"
            role="meter"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={cap}
            aria-label="AI credits used this month"
          >
            <div className="h-full rounded-full bg-amber" style={{ width: `${percentUsed}%` }} />
          </div>
          <p className="text-sm text-fog">
            {creditsLabel(used)} used. Unused credits do not roll over.
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-3xl tracking-tight text-paper">None</p>
          <p className="text-sm text-fog">
            Cloud AI is a paid feature — this account has no monthly credits. Everything you capture
            and edit by hand keeps working.
          </p>
        </>
      )}

      {explained ? (
        <div className="space-y-2 border-t border-seam pt-4 text-sm">
          <AllowanceLine
            label={promotionCredits !== null ? "Promotion this month" : "Monthly allowance"}
            value={creditsLabel(base)}
          />
          {granted > 0 ? (
            <AllowanceLine label="Credits added for you" value={`+${creditsLabel(granted)}`} />
          ) : null}
          <AllowanceLine label="Total this month" value={creditsLabel(cap)} />
        </div>
      ) : null}
    </section>
  );
}
