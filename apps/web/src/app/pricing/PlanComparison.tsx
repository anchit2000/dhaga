import { Check, Minus } from "lucide-react";
import {
  PLAN_COMPARISON_CELL_KEYS,
  PLAN_COMPARISON_ROWS,
  PRICING_PLANS,
} from "@/utils/constants/landing";
import type { ReactElement } from "react";

// Columns are driven straight off PRICING_PLANS, so the table can never fall
// out of order or out of date with the plan cards above it. Horizontally
// scrollable below ~720px (mobile-first rule: tables wrap in overflow-x-auto).
export function PlanComparison(): ReactElement {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20" id="compare-plans">
      <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
        Compare every plan
      </h2>
      <p className="mt-3 max-w-2xl text-fog">
        Cloud AI runs on a monthly credit allowance — 10 free, 300 on Pro and
        Annual. Everything else is unlimited on every plan. The job-change
        watchlist is capped at 25 contacts on the paid plans, and its nightly
        scans cost no credits.
      </p>
      {/* `relative` is load-bearing, not decoration: each cell carries an
          `sr-only` span, which is `position: absolute`. Without a positioned
          wrapper their containing block is `main`, so at 375px they sit at the
          720px table's far edge OUTSIDE this scroller's clip and drag the whole
          page 236px sideways. Positioning the scroller makes it their
          containing block, and the overflow is contained again. */}
      <div className="relative mt-10 overflow-x-auto rounded-2xl border border-wash/10 bg-panel/40">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">
            Dhaga plan comparison: what the Free, Annual, and Pro plans include.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-[34%] px-6 py-6">
                <span className="sr-only">Feature</span>
              </th>
              {PRICING_PLANS.map((plan) => (
                <th
                  key={plan.tier}
                  scope="col"
                  className={`px-5 py-6 text-left align-bottom font-normal ${
                    plan.highlight
                      ? "rounded-t-xl bg-amber/[0.09] shadow-[inset_0_1px_0_rgba(226,164,76,0.5)]"
                      : ""
                  }`}
                >
                  <p
                    className={`font-mono text-xs uppercase tracking-[0.18em] ${
                      plan.highlight ? "text-ember" : "text-fog"
                    }`}
                  >
                    {plan.tier}
                  </p>
                  <p className="mt-2 font-display text-2xl tabular-nums text-paper">
                    {plan.price}
                  </p>
                  <p className="text-xs text-fog">{plan.per}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON_ROWS.map((row, rowIndex) => (
              <tr key={row.feature} className="border-t border-seam/60">
                <th
                  scope="row"
                  className="px-6 py-4 text-left font-normal text-paper"
                >
                  {row.feature}
                </th>
                {PRICING_PLANS.map((plan) => (
                  <td
                    key={plan.tier}
                    className={`px-5 py-4 align-top ${
                      plan.highlight
                        ? `bg-amber/[0.09] ${
                            rowIndex === PLAN_COMPARISON_ROWS.length - 1
                              ? "rounded-b-xl"
                              : ""
                          }`
                        : ""
                    }`}
                  >
                    <PlanCell
                      value={row[PLAN_COMPARISON_CELL_KEYS[plan.tier]]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Renders a `"✓ …"` / `"✗ …"` cell as an icon plus its qualifier. */
function PlanCell({ value }: { value: string }): ReactElement {
  const included = value.startsWith("✓");
  const qualifier = value.slice(1).trim();
  return (
    <span className="flex items-start gap-2">
      {included ? (
        <Check className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden="true" />
      ) : (
        <Minus className="mt-0.5 size-4 shrink-0 text-fog/40" aria-hidden="true" />
      )}
      <span className="sr-only">{included ? "Included" : "Not included"}</span>
      {qualifier ? (
        <span className={included ? "text-paper" : "text-fog"}>
          {qualifier}
        </span>
      ) : null}
    </span>
  );
}
