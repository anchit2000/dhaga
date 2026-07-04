import { getBillingGate } from "@/lib/hosted/gate";
import { PLAN_FEATURES, type EntitlementPlan, type PlanFeature } from "@/utils/constants/plans";

/**
 * Payment-gate for features tied to the pricing model (utils/constants/plans.ts),
 * independent of the AI-action metering in lib/ai/metering.ts (which caps a
 * count, not a boolean). Modular by design: callers ask "can this user use
 * X" and never touch Stripe, plan strings, or the EE boundary directly.
 */

export class FeatureNotEntitledError extends Error {
  constructor(public readonly feature: PlanFeature) {
    super(`This feature isn't included in your current plan.`);
    this.name = "FeatureNotEntitledError";
  }
}

export async function currentPlan(userId: string): Promise<EntitlementPlan> {
  const summary = await (await getBillingGate()).getPlanSummary(userId);
  if (!summary) return "self_hosted"; // billing isn't running on this instance
  if (summary.status !== "active") return "free";
  return summary.plan;
}

export async function hasFeature(userId: string, feature: PlanFeature): Promise<boolean> {
  const plan = await currentPlan(userId);
  return PLAN_FEATURES[plan].includes(feature);
}

export async function requireFeature(userId: string, feature: PlanFeature): Promise<void> {
  if (!(await hasFeature(userId, feature))) throw new FeatureNotEntitledError(feature);
}
