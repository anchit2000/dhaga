import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  setDollarCapEnforcement,
  setDollarCapFloorUsd,
  setDollarCapMultiplier,
} from "@/lib/repo/ai-budget";
import { setSetting } from "@/lib/repo/settings";
import {
  AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY,
  DEFAULT_AI_DOLLAR_CAP_FLOOR_USD,
  DEFAULT_AI_DOLLAR_CAP_MULTIPLIER,
  PLAN_MONTHLY_REVENUE_USD,
} from "@/utils/constants/ai-budget";
import { clearActions, clearBudgetControls } from "./helpers";

/**
 * WHY THIS SUITE EXISTS: Pro is $8/month covering ALL AI plus operating costs,
 * and three metered features — signal_detection, person_classification,
 * goal_matching — are priced at 0 credits on purpose (billing an unasked-for
 * nightly sweep at 1 credit each would be ~26× its real cost). The moment that
 * happened, CREDITS STOPPED BOUNDING SPEND. The dollar ceiling is the backstop.
 *
 * This file pins WHICH CEILING EACH PLAN GETS. That it can actually refuse an
 * action, and that it is independent of the credit cap, is pinned next door in
 * ./dollar-gate.test.ts.
 */

const plan = {
  value: "pro" as "pro" | "power" | "free",
  unlimited: false,
  billing: true,
};

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => plan.unlimited,
    // `null` = billing isn't running on this instance (a self-host).
    getPlanSummary: async () =>
      plan.billing ? { plan: plan.value, status: "active", hasStripeCustomer: true } : null,
  }),
}));

const { effectiveMonthlyDollarCap } = await import("@/lib/ai/metering");
const { getAiBudgetConfig } = await import("@/lib/repo/ai-budget");

beforeEach(async () => {
  plan.value = "pro";
  plan.unlimited = false;
  plan.billing = true;
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearActions();
  await clearBudgetControls();
  await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the ceiling each plan resolves to, on a fresh instance", () => {
  it("gives Pro its monthly revenue times the multiplier", async () => {
    // $8 of revenue × 2.0 = $16. Loose by design: typical Pro inference is
    // ~$1.35 (~17% utilisation), so this catches a runaway, not a heavy user.
    const ceiling = await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1");
    expect(ceiling.usd).toBeCloseTo(
      PLAN_MONTHLY_REVENUE_USD.pro * DEFAULT_AI_DOLLAR_CAP_MULTIPLIER,
      10,
    );
    expect(ceiling.usd).toBeCloseTo(16, 10);
    expect(ceiling.source).toBe("plan");
  });

  it("gives FREE an absolute dollar ceiling, not a percentage of $0", async () => {
    // THE DAY-ONE BREAKAGE: free is $0 of revenue. 0 × 2.0 = $0, and a $0
    // ceiling refuses every AI action a free user takes — including the ten
    // their credit allowance is meant to buy. A flat floor instead.
    plan.value = "free";
    expect(PLAN_MONTHLY_REVENUE_USD.free).toBe(0);

    const ceiling = await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1");
    expect(ceiling.usd).toBe(DEFAULT_AI_DOLLAR_CAP_FLOOR_USD);
    expect(ceiling.source).toBe("floor");
    expect(ceiling.usd).toBeGreaterThan(0);
  });

  it("still bounds a plan that has NO credit ceiling at all", async () => {
    // An admin can set any plan's allowance to null, and then nothing else in
    // the system limits the account — which is exactly why the dollar gate
    // must still reach it.
    plan.value = "power";
    plan.unlimited = true;

    expect((await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1")).usd).not.toBeNull();
  });

  it("leaves a self-host with no billing entirely ungated", async () => {
    // They pay their own provider bill; inventing a ceiling out of our revenue
    // model would break their instance for no reason.
    plan.billing = false;
    const ceiling = await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1");
    expect(ceiling.usd).toBeNull();
    expect(ceiling.source).toBe("unset");
  });

  it("lets a per-user override outrank the plan, exactly as the credit ladder does", async () => {
    await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "3.5");
    const ceiling = await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1");
    expect(ceiling.usd).toBe(3.5);
    expect(ceiling.source).toBe("override");
  });

  it("goes inert when an admin turns enforcement off", async () => {
    await setDollarCapEnforcement(false);
    expect((await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1")).usd).toBeNull();
  });
});

describe("the admin controls move the ceiling", () => {
  it("re-sizes every paid plan through the multiplier", async () => {
    await setDollarCapMultiplier(0.5);
    const ceiling = await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1");
    expect(ceiling.usd).toBeCloseTo(PLAN_MONTHLY_REVENUE_USD.pro * 0.5, 10);
  });

  it("re-sizes free through the floor, which the multiplier never touches", async () => {
    plan.value = "free";
    await setDollarCapMultiplier(10);
    await setDollarCapFloorUsd(2);

    const ceiling = await effectiveMonthlyDollarCap(await getAiBudgetConfig(), "user-1");
    expect(ceiling.usd).toBe(2);
    expect(ceiling.source).toBe("floor");
  });
});
