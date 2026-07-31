import { ActivityCard } from "./ActivityCard";
import { AllowanceCard } from "./AllowanceCard";
import { BreakdownCard } from "./BreakdownCard";
import type { AiCreditsOverview } from "@/types";

/**
 * The user's own AI-credits view (/app/settings#credits), read top to bottom in
 * the order the questions get asked: what is left → what did I spend it on →
 * what exactly did I do. Presentational only; every number is computed once, in
 * `lib/repo/ai-usage`, from the acting user's own rows.
 */
export function AiCreditsSetting({ overview }: { overview: AiCreditsOverview }) {
  return (
    <>
      <AllowanceCard allowance={overview.allowance} />
      <BreakdownCard
        rows={overview.breakdown}
        totalCredits={overview.totalCredits}
        totalActions={overview.totalActions}
      />
      <ActivityCard rows={overview.recent} />
    </>
  );
}

/** No cloud LLM is configured on this instance, so there is no metered spend to
 *  report. Say that plainly rather than rendering a zeroed-out ledger that looks
 *  like the feature is broken. */
export function AiCreditsUnavailable() {
  return (
    <section
      data-tour="credits"
      className="scroll-mt-20 space-y-2 rounded-2xl border border-seam bg-panel p-5 sm:p-6"
    >
      <h2 className="font-display text-lg">AI credits</h2>
      <p className="text-sm text-fog">
        This instance has no cloud AI provider configured, so nothing here spends credits. Capture,
        notes, and everything you edit by hand work exactly as they do with AI on.
      </p>
    </section>
  );
}
