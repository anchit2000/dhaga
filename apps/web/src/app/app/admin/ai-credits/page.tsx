// Dhaga Cloud only — see packages/ee/LICENSE.
import Link from "next/link";
import { EnforcementCard } from "@/components/app/admin/ai-budget/EnforcementCard";
import { GrantCard } from "@/components/app/admin/ai-budget/GrantCard";
import { PlanAllowanceCard } from "@/components/app/admin/ai-budget/PlanAllowanceCard";
import { PromotionCard } from "@/components/app/admin/ai-budget/PromotionCard";
import { CostCard } from "@/components/app/admin/ai-budget/cost/CostCard";
import { DollarCapCard } from "@/components/app/admin/ai-budget/cost/DollarCapCard";
import { DollarEnforcementCard } from "@/components/app/admin/ai-budget/cost/DollarEnforcementCard";
import { TopSpendersCard } from "@/components/app/admin/ai-budget/cost/TopSpendersCard";
import { getAiCostSummary } from "@/components/app/admin/ai-budget/cost/data";
import { instanceDefaultCap } from "@/lib/ai/metering";
import { requireAdminForPage } from "@/lib/hosted/gate";
import { getAiBudgetConfig } from "@/lib/repo/ai-budget";

export const metadata = { title: "AI credits — Admin — Dhaga" };

/**
 * Instance-wide AI cost and credit controls. What it actually cost first —
 * an operator who cannot see the bill cannot judge any of the levers below it —
 * then the two ceilings, in the order they are enforced: credits (what a user
 * may DO) and dollars (what their month may COST).
 *
 * The precedence blurbs below are verbatim restatements of the contracts in
 * lib/ai/metering/cap/index.ts and lib/ai/metering/dollar-cap.ts. If one
 * changes, the other changes in the same edit — an operator reading this screen
 * must not be reading last month's rules.
 */
export default async function AdminAiCreditsPage() {
  await requireAdminForPage();
  // Sequential, never Promise.all: both reads are cross-tenant work against a
  // three-connection pool (docs/SCALING.md).
  const config = await getAiBudgetConfig();
  const cost = await getAiCostSummary(config.dollarCap);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">AI cost &amp; credits</h1>
        <p className="mt-1 text-sm text-fog">
          Two independent ceilings. CREDITS cap what a user may do — precedence, highest
          first: per-user override → promotion → plan allowance → the instance default,
          with active grants added on top of whichever wins. DOLLARS cap what their month
          may cost us, and are the only ceiling that can see the three features priced at
          0 credits.
        </p>
        <p className="mt-2 text-sm text-fog">
          <code>DHAGA_AI_MONTHLY_CAP</code> is a <span className="text-paper">seed</span>,
          not an override: it supplies the instance default only while nothing has been
          set here. Anything you set below wins over it.
        </p>
      </div>

      <CostCard summary={cost} />
      <TopSpendersCard rows={cost.topUsers} />
      <DollarEnforcementCard enabled={config.dollarCap.enforced} />
      <DollarCapCard config={config.dollarCap} />

      <EnforcementCard enabled={config.enforcePlanCaps} />
      <PlanAllowanceCard
        allowances={config.allowances}
        enforced={config.enforcePlanCaps}
        instanceDefault={instanceDefaultCap(config.allowances)}
      />
      <PromotionCard promotion={config.promotion} active={config.promotionCredits !== null} />
      <GrantCard />
      <div className="rounded-2xl border border-seam bg-panel p-5">
        <p className="text-sm font-medium text-paper">Grant ledger</p>
        <p className="mt-1 text-sm text-fog">
          Every grant ever made, searchable by recipient.
        </p>
        <Link href="/app/admin/ai-credits/grants" className="mt-2 inline-block text-sm text-ember hover:underline">
          View ledger →
        </Link>
      </div>
    </div>
  );
}
