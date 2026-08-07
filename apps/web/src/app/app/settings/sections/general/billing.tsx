import { hasLLM } from "@dhaga/core";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getBillingGate } from "@/lib/hosted/gate";
import { preferredProcessor } from "@/lib/billing/processor";
import { aiCreditsUsedThisMonth, effectiveMonthlyAiCap, hasUnlimitedAiCredits } from "@/lib/ai/metering";
import { BillingSetting } from "@/components/app/settings/BillingSetting";

/** Only renders on a hosted instance with EE billing (getPlanSummary non-null).
 *  When it does, it also surfaces the acting user's monthly AI-credit balance,
 *  read through the same metering accessors that enforce the cap (hasLLM gate,
 *  so no line shows when the instance has no LLM configured). */
export async function BillingSection() {
  const userId = await requireUserIdForPage();
  const gate = await getBillingGate();
  const planSummary = await gate.getPlanSummary(userId);
  if (!planSummary) return null;
  const [used, unlimited] = await Promise.all([
    hasLLM() ? aiCreditsUsedThisMonth() : Promise.resolve(0),
    // The metering answer, not the billing gate's: with plan-cap enforcement on
    // the gate would say "unlimited" while the dock correctly shows "n of 300".
    hasLLM() ? hasUnlimitedAiCredits(userId) : Promise.resolve(false),
  ]);
  const aiUsage = hasLLM() ? { used, cap: await effectiveMonthlyAiCap(), unlimited } : null;
  // Country → which processor's button leads and which currency the cards
  // show. A default, never a lock; see lib/billing/processor.
  return (
    <BillingSetting
      summary={planSummary}
      aiUsage={aiUsage}
      preferred={await preferredProcessor()}
    />
  );
}
