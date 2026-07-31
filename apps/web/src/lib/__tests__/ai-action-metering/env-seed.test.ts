import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPlanAllowanceOverrides, setPlanCapEnforcement } from "@/lib/repo/ai-budget";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { PLAN_AI_CREDITS_PER_MONTH } from "@/utils/constants/plans";
import { clearBudgetControls } from "./helpers";

/**
 * WHY THESE TESTS EXIST: `DHAGA_AI_MONTHLY_CAP` is a SEED, not an override.
 *
 * It used to sit above the free-tier number and below everything else, which
 * made it impossible for an operator to answer the only question that matters
 * when a user complains about their cap: which number is actually live? An admin
 * could type a value into /app/admin/ai-credits, watch nothing change, and have
 * no way to tell that a deploy-time environment variable was quietly winning.
 *
 * The rule these cases pin: env supplies the instance default ONLY while nothing
 * has been set in the database. Anything an admin sets — a per-user override, a
 * promotion, a plan allowance, or the Free allowance that doubles as the
 * instance default — takes over permanently. Nothing is copied into the database
 * at boot; env is simply consulted last, which is what lets the admin screen name
 * the live source instead of guessing.
 *
 * The seed still has to WORK, though — a self-hoster on a core-only build has no
 * admin panel at all, so the env var is their only control. That is pinned here
 * as hard as the precedence is.
 */

const plan = { value: "pro" as "pro" | "free" | null, unlimited: true };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => plan.unlimited,
    /** `null` = billing isn't running here, i.e. a self-host: no plan is in
     *  play, so the instance default is the only rung left. */
    getPlanSummary: async () =>
      plan.value === null
        ? null
        : { plan: plan.value, status: "active", hasStripeCustomer: true },
  }),
}));

const { effectiveMonthlyAiCap, hasUnlimitedAiCredits } = await import("@/lib/ai/metering");

beforeEach(async () => {
  plan.value = "free";
  plan.unlimited = false;
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearBudgetControls();
  await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the seed applies when, and only when, the database is silent", () => {
  it("governs a self-hosted instance that has no admin panel to set anything with", async () => {
    plan.value = null;
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");

    expect(await hasUnlimitedAiCredits("user-1")).toBe(false);
    expect(await effectiveMonthlyAiCap("user-1")).toBe(500);
  });

  it("governs a free user too, so the same env var means the same thing everywhere", async () => {
    // Free and "no plan is in play" resolve through ONE rung on purpose. If they
    // didn't, the same env var would work on a self-host and silently do nothing
    // on an instance that happens to have billing.
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");

    expect(await effectiveMonthlyAiCap("user-1")).toBe(500);
  });

  it("falls to the shipped free-tier number when neither the DB nor env says anything", async () => {
    expect(await effectiveMonthlyAiCap("user-1")).toBe(PLAN_AI_CREDITS_PER_MONTH.free);
    expect(PLAN_AI_CREDITS_PER_MONTH.free).toBe(10);
  });

  it("ignores an unusable env value rather than capping everyone at zero", async () => {
    for (const bad of ["0", "-5", "abc", "  "]) {
      vi.stubEnv("DHAGA_AI_MONTHLY_CAP", bad);
      expect(await effectiveMonthlyAiCap("user-1")).toBe(PLAN_AI_CREDITS_PER_MONTH.free);
    }
  });
});

describe("an admin-set number retires the seed", () => {
  it("holds a free user to the admin's Free allowance, not the env var", async () => {
    // The regression this guards: an operator sets 25 in the panel, an old env
    // var says 500, and users silently get 500.
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");
    await setPlanAllowanceOverrides({ free: 25 });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });

  it("holds a Pro user to the admin's allowance, not the env var", async () => {
    plan.value = "pro";
    plan.unlimited = true;
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");
    await setPlanAllowanceOverrides({ pro: 42 });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(42);
  });

  it("honours an explicit Free allowance of zero instead of falling back to the seed", async () => {
    // "0" and "unset" are different answers. An operator who deliberately turns
    // cloud AI off for free users must not have a stale env var re-enable it.
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");
    await setPlanAllowanceOverrides({ free: 0 });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(0);
  });

  it("beats the seed for a per-user override as well", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");

    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });

  it("keeps beating the seed when the master switch is off", async () => {
    // Turning enforcement off is a fallback to the billing entitlement, not a
    // handover of the instance default back to the environment.
    await setPlanCapEnforcement(false);
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "500");
    await setPlanAllowanceOverrides({ free: 25 });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(25);
  });
});
