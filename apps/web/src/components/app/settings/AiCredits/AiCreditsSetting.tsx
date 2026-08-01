import { ActivityCard } from "./ActivityCard";
import { AllowanceCard } from "./AllowanceCard";
import { BreakdownCard } from "./BreakdownCard";
import { AI_ACTIVITY_LIMIT } from "@/utils/constants/ai-credits";
import type { AiCreditsOverview } from "@/types";

/**
 * The user's own AI-credits view (/app/settings#credits), read top to bottom in
 * the order the questions get asked: what is left → what did I spend it on →
 * what exactly did I do. Presentational only; every number is computed once, in
 * `lib/repo/ai-usage`, from the acting user's own rows.
 */
export function AiCreditsSetting({ overview }: { overview: AiCreditsOverview }) {
  // ActivityCard is a client component (it pages through history via a server
  // action), so its Date fields cross that boundary as ISO strings here, right
  // at the edge — same convention as NotificationItem.createdAt.
  const initialRows = overview.recent.map((row) => ({ ...row, at: row.at.toISOString() }));
  const lastRow = overview.recent.at(-1);
  // A first batch shorter than a full page means there is nothing after it —
  // no need to round-trip to the server just to learn that.
  const initialCursor =
    lastRow && overview.recent.length >= AI_ACTIVITY_LIMIT
      ? { at: lastRow.at.toISOString(), id: lastRow.id }
      : null;

  return (
    <>
      <AllowanceCard allowance={overview.allowance} />
      <BreakdownCard
        rows={overview.breakdown}
        totalCredits={overview.totalCredits}
        totalActions={overview.totalActions}
      />
      <ActivityCard initialRows={initialRows} initialCursor={initialCursor} />
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
