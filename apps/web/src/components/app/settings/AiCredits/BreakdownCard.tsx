import { Badge } from "@/components/ui/badge";
import { creditsLabel } from "./format";
import type { AiCreditBreakdownRow } from "@/types";

/**
 * Where the month's credits went, by action type.
 *
 * The rows are computed from the same per-feature aggregate the total is derived
 * from, so they always add up — the "Total" line is the sum of what is on
 * screen, not a separately-fetched number that could disagree with it.
 *
 * Zero-credit actions (watchlist scans) are LISTED, marked free. Hiding them
 * would leave a user whose watchlist ran all month wondering why none of it is
 * accounted for.
 */
export function BreakdownCard({
  rows,
  totalCredits,
  totalActions,
}: {
  rows: AiCreditBreakdownRow[];
  totalCredits: number;
  totalActions: number;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Where your credits went</h2>
        <p className="mt-1 text-sm text-fog">
          Every AI action you ran this month, and what each one cost.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-fog">
          No AI actions yet this month. Scanning a card, saving a note, or asking Dhaga a question
          will show up here.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-seam border-t border-seam">
            {rows.map((row) => (
              <li key={row.feature} className="flex items-baseline justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{row.label}</p>
                  <p className="mt-0.5 text-xs text-fog">
                    {row.count} {row.count === 1 ? "action" : "actions"}
                  </p>
                </div>
                {row.free ? (
                  <Badge variant="secondary" className="shrink-0">
                    Free
                  </Badge>
                ) : (
                  <span className="shrink-0 text-sm tabular-nums text-paper">
                    {creditsLabel(row.credits)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-3 border-t border-seam pt-3 text-sm">
            <span className="min-w-0 font-medium text-paper">
              Total
              <span className="ml-1 font-normal text-fog">
                ({totalActions} {totalActions === 1 ? "action" : "actions"})
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-paper">{creditsLabel(totalCredits)}</span>
          </div>
        </>
      )}
    </section>
  );
}
