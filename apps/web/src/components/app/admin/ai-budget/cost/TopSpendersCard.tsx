// Dhaga Cloud only — see packages/ee/LICENSE.
import { ADMIN_TOP_SPENDER_LIMIT } from "@/utils/constants/ai-credits";
import { formatUsd } from "./labels";
import type { AiUserCostRow } from "@/types";
import type { ReactElement } from "react";

/**
 * The costliest accounts this month against the ceiling each one actually has.
 *
 * UTILISATION IS THE POINT. "Is 200% the right multiplier?" is unanswerable
 * from the multiplier alone; it is obvious from a column of percentages. If the
 * busiest account on the instance sits at 12%, the ceiling is a backstop doing
 * its job. If accounts cluster near 100%, either the multiplier is too tight or
 * the credit allowance is too generous for what it is priced at.
 */
const SOURCE_LABELS: Record<AiUserCostRow["ceiling"]["source"], string> = {
  override: "per-user override",
  plan: "plan × multiplier",
  floor: "flat (no recurring revenue)",
  unset: "no ceiling",
};

export function TopSpendersCard({ rows }: { rows: AiUserCostRow[] }): ReactElement {
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5">
      <div>
        <p className="text-sm font-medium text-paper">
          Top {ADMIN_TOP_SPENDER_LIMIT} accounts by AI cost
        </p>
        <p className="mt-1 text-sm text-fog">
          This month&rsquo;s real inference cost per account, against the dollar ceiling in
          force for them. Credits are shown alongside so the two ceilings can be compared
          — an account high in dollars but low in credits is spending on the uncredited
          nightly passes.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-fog">No AI actions recorded this month.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-fog">
              <tr>
                <th className="py-1 text-left font-normal">Account</th>
                <th className="py-1 text-right font-normal">Cost</th>
                <th className="py-1 text-right font-normal">Credits</th>
                <th className="py-1 text-right font-normal">Ceiling</th>
                <th className="py-1 text-right font-normal">Used</th>
              </tr>
            </thead>
            <tbody className="text-paper">
              {rows.map((row) => (
                <tr key={row.userId} className="border-t border-seam align-top">
                  <td className="py-1.5">
                    <span className="block">{row.email}</span>
                    <span className="text-fog">{row.plan}</span>
                  </td>
                  <td className="py-1.5 text-right">{formatUsd(row.usd)}</td>
                  <td className="py-1.5 text-right">{row.credits}</td>
                  <td className="py-1.5 text-right">
                    <span className="block">
                      {row.ceiling.usd === null ? "—" : formatUsd(row.ceiling.usd)}
                    </span>
                    <span className="text-fog">{SOURCE_LABELS[row.ceiling.source]}</span>
                  </td>
                  <td className="py-1.5 text-right">
                    {row.utilisationPct === null ? (
                      "—"
                    ) : (
                      <span className={row.utilisationPct >= 100 ? "text-destructive" : undefined}>
                        {row.utilisationPct.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
