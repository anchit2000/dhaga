import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  setPlanAllowanceOverrides,
  setPlanCapEnforcement,
  setPromotion,
} from "@/lib/repo/ai-budget";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { PLAN_AI_CREDITS_PER_MONTH } from "@/utils/constants/plans";
import { clearBudgetControls } from "./helpers";

/**
 * WHY THESE TESTS EXIST: the admin panel can edit the monthly credit allowance
 * for each plan, run an instance-wide promotion, and grant make-good credits.
 * Every one of those levers can change what a PAYING customer is allowed to do,
 * so the order they resolve in is a product promise, not an implementation
 * detail:
 *
 *   per-user override → promotion → paid plan allowance → instance default
 *
 * ENFORCEMENT IS ON BY DEFAULT, which is the rung-3 half of that and the thing
 * most easily regressed: the allowances in constants/plans.ts are what the
 * pricing page states, so they have to be what a user actually gets on a fresh
 * instance with no admin ever having visited the panel. The master switch
 * survives as an escape hatch (a migration, an incident) and is pinned here too
 * — off means "fall back to the raw billing entitlement", not "no controls".
 *
 * The rung-4 half — `DHAGA_AI_MONTHLY_CAP` is a SEED, never an override — is
 * pinned next door in ./env-seed.test.ts.
 */

const plan = { value: "pro" as "pro" | "lifetime" | "free", unlimited: true };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    // The raw billing entitlement — what a paid plan resolves through when the
    // master switch is OFF.
    hasUnlimitedAi: async () => plan.unlimited,
    getPlanSummary: async () => ({ plan: plan.value, status: "active", hasStripeCustomer: true }),
  }),
}));

const { effectiveMonthlyAiCap, hasUnlimitedAiCredits } = await import("@/lib/ai/metering");

beforeEach(async () => {
  plan.value = "pro";
  plan.unlimited = true;
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearBudgetControls();
  await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("plan caps are enforced on a fresh instance, with nothing configured", () => {
  it("holds a Pro user to their plan allowance even though billing calls them unlimited", async () => {
    // No admin has touched the panel. The number the pricing page states is the
    // number the user gets — that is the whole point of defaulting the switch on.
    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(PLAN_AI_CREDITS_PER_MONTH.pro);
  });

  it("gives a free user the shipped free allowance rather than nothing", async () => {
    plan.value = "free";
    plan.unlimited = false;

    // Free is a real, small taste of cloud AI (10 credits ≈ 10 card scans, or
    // 5 scans plus 5 notes), not a locked door.
    expect(await effectiveMonthlyAiCap("user-1")).toBe(PLAN_AI_CREDITS_PER_MONTH.free);
    expect(PLAN_AI_CREDITS_PER_MONTH.free).toBe(10);
  });

  it("keeps a plan whose allowance is null uncapped", async () => {
    plan.value = "lifetime"; // PLAN_AI_CREDITS_PER_MONTH.lifetime === null
    expect(await hasUnlimitedAiCredits("user-1")).toBe(true);
  });
});

describe("an admin-set plan allowance is what the ladder uses", () => {
  it("replaces the shipped constant for a Pro user", async () => {
    await setPlanAllowanceOverrides({ pro: 42 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(42);
  });

  it("lets an admin cap a plan the constants leave uncapped", async () => {
    plan.value = "lifetime";
    await setPlanAllowanceOverrides({ lifetime: 900 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(900);
  });
});

describe("turning the master switch off is an escape hatch, not a reset", () => {
  beforeEach(async () => {
    await setPlanCapEnforcement(false);
  });

  it("drops a paid user back to their raw billing entitlement", async () => {
    // What an operator reaches for mid-incident: stop consulting the ladder,
    // let Stripe's answer stand. Allowances stay stored and inert.
    await setPlanAllowanceOverrides({ pro: 42 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(true);
  });

  it("still honours the admin's instance default for a user with no entitlement", async () => {
    // Off does NOT hand control back to env: the Free allowance is the instance
    // default, and an admin-set number outranks the seed in either switch state.
    plan.unlimited = false;
    plan.value = "free";
    await setPlanAllowanceOverrides({ free: 25 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });
});

describe("a per-user override outranks everything below it", () => {
  it("is not clobbered by a promotion running for everyone else", async () => {
    // An admin who typed a number against ONE account made a decision about that
    // account. A campaign must not silently overwrite it.
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");
    await setPromotion({
      credits: 1000,
      startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      note: "launch month",
    });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });

  it("outranks the plan allowance under enforcement too", async () => {
    await setPlanAllowanceOverrides({ pro: 42 });
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });
});
