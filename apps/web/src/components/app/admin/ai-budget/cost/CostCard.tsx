// Dhaga Cloud only — see packages/ee/LICENSE.
import { ASSUMED_USD_PER_CREDIT } from "@/utils/constants/model-pricing";
import { formatUsd } from "./labels";
import type { AiCostSummary } from "@/types";
import type { ReactElement } from "react";

/**
 * What AI actually cost this month, instance-wide, computed from recorded
 * tokens — not estimated from credits. Three things an operator cannot get
 * anywhere else:
 *
 *   1. UNCREDITED spend shown apart from credited. Those features cost 0
 *      credits on purpose, so the credit meter reports them as free; this is
 *      the only place their real cost appears.
 *   2. MEASURED $/credit next to the ~$0.006 the credit table was sized
 *      against. Drift between the two means the credit prices need re-deriving.
 *   3. Per-user utilisation of the dollar ceiling, so "is 200% the right
 *      multiplier?" is answered by data rather than intuition.
 */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }): ReactElement {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wide text-fog">{label}</p>
      <p className="mt-1 text-lg text-paper">{value}</p>
      {hint ? <p className="mt-0.5 text-sm text-fog">{hint}</p> : null}
    </div>
  );
}

function driftHint(measured: number | null): string {
  if (measured === null) return "No credited actions yet this month.";
  const ratio = measured / ASSUMED_USD_PER_CREDIT;
  const assumed = `assumed ≤ $${ASSUMED_USD_PER_CREDIT.toFixed(4)}`;
  if (ratio > 1) return `${assumed} — running ${ratio.toFixed(2)}× the assumption`;
  return `${assumed} — ${(ratio * 100).toFixed(0)}% of it`;
}

export function CostCard({ summary }: { summary: AiCostSummary }): ReactElement {
  return (
    <div className="space-y-5 rounded-2xl border border-seam bg-panel p-5">
      <div>
        <p className="text-sm font-medium text-paper">AI cost this month</p>
        <p className="mt-1 text-sm text-fog">
          Real dollars, computed from the tokens recorded on every action — model rates
          and the Batch API&rsquo;s 50% discount included. Prompt caching is deliberately
          not modelled: every system prompt is below the minimum cacheable prefix.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Total"
          value={formatUsd(summary.totalUsd)}
          hint={`${summary.totalActions} actions · ${summary.totalCredits} credits`}
        />
        <Stat
          label="Credited"
          value={formatUsd(summary.creditedUsd)}
          hint="Spend the credit allowance can see"
        />
        <Stat
          label="Uncredited"
          value={formatUsd(summary.uncreditedUsd)}
          hint="Invisible to the credit meter"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat
          label="Measured $ / credit"
          value={
            summary.measuredUsdPerCredit === null
              ? "—"
              : `$${summary.measuredUsdPerCredit.toFixed(4)}`
          }
          hint={driftHint(summary.measuredUsdPerCredit)}
        />
        <Stat
          label="All-in $ / credit"
          value={
            summary.allInUsdPerCredit === null ? "—" : `$${summary.allInUsdPerCredit.toFixed(4)}`
          }
          hint="With uncredited spend paid for out of credited revenue"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-paper">Uncredited spend, by feature</p>
        <p className="mt-1 text-sm text-fog">
          These cost 0 credits by design — billing an unasked-for nightly sweep per
          contact would be ~26× its real cost. The dollar ceiling is what bounds them.
        </p>
        {summary.uncreditedFeatures.length === 0 ? (
          <p className="mt-2 text-sm text-fog">None this month.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-fog">
                <tr>
                  <th className="py-1 text-left font-normal">Feature</th>
                  <th className="py-1 text-right font-normal">Actions</th>
                  <th className="py-1 text-right font-normal">Cost</th>
                </tr>
              </thead>
              <tbody className="text-paper">
                {summary.uncreditedFeatures.map((row) => (
                  <tr key={row.feature} className="border-t border-seam">
                    <td className="py-1.5">{row.label}</td>
                    <td className="py-1.5 text-right">{row.actions}</td>
                    <td className="py-1.5 text-right">{formatUsd(row.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
