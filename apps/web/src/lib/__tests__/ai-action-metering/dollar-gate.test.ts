import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY } from "@/utils/constants/ai-budget";
import { clearActions, clearBudgetControls, recordNightlyClassification } from "./helpers";

/**
 * WHY THIS SUITE EXISTS: a cost gate that cannot refuse anything is theatre.
 * These cases are the ones that must be able to FAIL — if the gate is ever
 * wired somewhere the uncredited nightly sweeps do not pass through, or the
 * dollar check drifts back inside the `hasUnlimitedAiCredits` early return,
 * one of these goes red.
 *
 *   - it blocks a 0-CREDIT action once the dollar ceiling is passed (the credit
 *     cap physically cannot see that action, which is the whole hole);
 *   - it reaches an unlimited-CREDIT plan (Lifetime), the account nothing else
 *     bounds;
 *   - credits and dollars are INDEPENDENT: either can refuse while the other
 *     has room, and the user gets the message that matches which one tripped.
 *
 * Which ceiling each plan resolves to is pinned next door in ./dollar-cap.test.ts.
 */

const plan = { value: "pro" as "pro" | "lifetime" | "free", unlimited: false };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => plan.unlimited,
    getPlanSummary: async () => ({ plan: plan.value, status: "active", hasStripeCustomer: true }),
  }),
}));

// The burst guard is about rate, not budget — stubbed out so a tight loop of
// assertions in one test cannot mask a budget result with a rate-limit result.
vi.mock("@/lib/ratelimit", () => ({
  enforceRateLimit: async () => undefined,
  RateLimitError: class RateLimitError extends Error {},
}));

const { AiBudgetError, aiDollarsUsedThisMonth, assertAiBudget, hasMonthlyAiBudget, recordAiAction, withAiAction } =
  await import("@/lib/ai/metering");

beforeEach(async () => {
  plan.value = "pro";
  plan.unlimited = false;
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearActions();
  await clearBudgetControls();
  await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
  await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the gate can actually refuse a 0-credit action", () => {
  it("blocks a nightly classification once the dollar ceiling is passed", async () => {
    // A small ceiling stands in for a month of sweeps. Each action below costs
    // 0 CREDITS, so before this gate existed nothing on the account could stop
    // them however long they ran — that is the hole being closed.
    await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "1.5");

    await recordNightlyClassification(); // $0.50
    expect(await aiDollarsUsedThisMonth()).toBeCloseTo(0.5, 10);
    await expect(
      withAiAction("person_classification", () => assertAiBudget("user-1")),
    ).resolves.toBeUndefined();

    await recordNightlyClassification();
    await recordNightlyClassification(); // $1.50 spent — ceiling reached

    const refusal = withAiAction("person_classification", () => assertAiBudget("user-1"));
    await expect(refusal).rejects.toBeInstanceOf(AiBudgetError);
    await expect(refusal).rejects.toMatchObject({ kind: "dollar_cap" });
  });

  it("refuses the same way for a plan with unlimited credits", async () => {
    // Unlimited CREDITS must not mean unlimited DOLLARS. If the dollar check
    // sat inside the credit branch, this account would bypass the gate.
    plan.value = "lifetime";
    plan.unlimited = true;
    await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "0.4");
    await recordNightlyClassification(); // $0.50 > $0.40

    await expect(withAiAction("search", () => assertAiBudget("user-1"))).rejects.toMatchObject({
      kind: "dollar_cap",
    });
  });

  it("stops background jobs being enqueued at all", async () => {
    // hasMonthlyAiBudget is the pre-flight ("should we even queue this?"). It
    // has to agree with the gate, or we queue work that can only fail.
    await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "0.25");
    expect(await hasMonthlyAiBudget("user-1")).toBe(true);

    await recordNightlyClassification(); // $0.50
    expect(await hasMonthlyAiBudget("user-1")).toBe(false);
  });
});

describe("credits and dollars are independent ceilings", () => {
  it("lets the DOLLAR ceiling refuse a user who has credits to spare", async () => {
    // 300 Pro credits untouched, but the month's real bill is past the ceiling.
    // Only the dollar gate can see this, because the spend was uncredited.
    await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "0.4");
    await recordNightlyClassification(); // 0 credits, $0.50

    await expect(withAiAction("card_scan", () => assertAiBudget("user-1"))).rejects.toMatchObject({
      kind: "dollar_cap",
    });
  });

  it("lets the CREDIT cap refuse a user who has dollars to spare", async () => {
    // The mirror image: a card scan costs cents but exhausts a small credit
    // allowance. The credit message is the one the user can act on (upgrade),
    // so credits are checked first and must still be what they hear.
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "1");
    await withAiAction("card_scan", async () => {
      await recordAiAction("card_scan", "claude-haiku-4-5", {
        inputTokens: 1733,
        outputTokens: 99,
      });
    });

    expect(await aiDollarsUsedThisMonth()).toBeLessThan(0.01);
    await expect(withAiAction("card_scan", () => assertAiBudget("user-1"))).rejects.toMatchObject({
      kind: "cap",
    });
  });

  it("admits an action only when BOTH ceilings have room", async () => {
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "50");
    await setSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY, "5");
    await recordNightlyClassification(); // $0.50 of $5, 0 of 50 credits

    await expect(withAiAction("card_scan", () => assertAiBudget("user-1"))).resolves.toBeUndefined();
  });
});
