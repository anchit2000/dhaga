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
 * WHY THESE TESTS EXIST: the admin panel can now edit the monthly credit
 * allowance for each plan, run an instance-wide promotion, and grant make-good
 * credits. Every one of those levers can change what a PAYING customer is
 * allowed to do, so the order they resolve in is a product promise, not an
 * implementation detail:
 *
 *   per-user override → promotion → plan allowance → env cap → free tier
 *
 * and the plan-allowance rung only exists when an admin has explicitly turned
 * enforcement ON. With it off, behaviour must be byte-for-byte what shipped
 * before these controls existed — because the pricing page sells Pro and Annual
 * as "no monthly cap" and nobody bought a ceiling.
 */

const plan = { value: "pro" as "pro" | "lifetime" | "free", unlimited: true };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    // Stands in for a live Stripe subscription: today a paid plan bypasses the
    // cap entirely through exactly this call.
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

describe("the master switch is off by default", () => {
  it("leaves a Pro user exactly as they are today, even with allowances stored", async () => {
    // An admin can size the ladder without it taking effect — that separation is
    // the entire safety story of shipping this feature.
    await setPlanAllowanceOverrides({ pro: 42 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(true);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(0);
  });

  it("still honours the self-host env cap for a user with no subscription", async () => {
    plan.unlimited = false;
    plan.value = "free";
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(500);
  });
});

describe("with the master switch on, the credit ladder governs", () => {
  beforeEach(async () => {
    await setPlanCapEnforcement(true);
  });

  it("gives a Pro user the admin-set allowance instead of unlimited", async () => {
    await setPlanAllowanceOverrides({ pro: 42 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(42);
  });

  it("falls back to the constant when the admin has set nothing", async () => {
    expect(await effectiveMonthlyAiCap("user-1")).toBe(PLAN_AI_CREDITS_PER_MONTH.pro);
  });

  it("keeps a plan whose allowance is null uncapped", async () => {
    plan.value = "lifetime"; // PLAN_AI_CREDITS_PER_MONTH.lifetime === null
    expect(await hasUnlimitedAiCredits("user-1")).toBe(true);
  });

  it("caps a plan an admin has explicitly given a number to", async () => {
    plan.value = "lifetime";
    await setPlanAllowanceOverrides({ lifetime: 900 });

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(900);
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
    await setPlanCapEnforcement(true);
    await setPlanAllowanceOverrides({ pro: 42 });
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });
});
