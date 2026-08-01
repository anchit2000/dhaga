// Dhaga Cloud only — see packages/ee/LICENSE.
import Link from "next/link";
import { EnforcementCard } from "@/components/app/admin/ai-budget/EnforcementCard";
import { GrantCard } from "@/components/app/admin/ai-budget/GrantCard";
import { PlanAllowanceCard } from "@/components/app/admin/ai-budget/PlanAllowanceCard";
import { PromotionCard } from "@/components/app/admin/ai-budget/PromotionCard";
import { instanceDefaultCap } from "@/lib/ai/metering";
import { requireAdminForPage } from "@/lib/hosted/gate";
import { getAiBudgetConfig } from "@/lib/repo/ai-budget";

export const metadata = { title: "AI credits — Admin — Dhaga" };

/**
 * Instance-wide AI credit controls. Four levers, in the order an operator
 * reasons about them: is anything enforced at all → what does each plan get →
 * is a promotion running → who got made whole, and why.
 *
 * The precedence blurb below is a verbatim restatement of the contract in
 * lib/ai/metering/cap/index.ts. If one changes, the other changes in the same
 * edit — an operator reading this screen must not be reading last month's rules.
 */
export default async function AdminAiCreditsPage() {
  await requireAdminForPage();
  const config = await getAiBudgetConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">AI credits</h1>
        <p className="mt-1 text-sm text-fog">
          Monthly AI-credit allowances for this instance. Precedence, highest first:
          per-user override → promotion → plan allowance → the instance default. Active
          grants are added on top of whichever one wins.
        </p>
        <p className="mt-2 text-sm text-fog">
          <code>DHAGA_AI_MONTHLY_CAP</code> is a <span className="text-paper">seed</span>,
          not an override: it supplies the instance default only while nothing has been
          set here. Anything you set below wins over it.
        </p>
      </div>

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
