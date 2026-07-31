import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { effectiveMonthlyAiCap } from "@/lib/ai/metering";
import { PLAN_AI_CREDITS_PER_MONTH } from "@/utils/constants/plans";

// getCurrentUser=null makes request-scope fall back to the unscoped in-memory
// PGlite, so the settings write/read round-trips for real (same pattern as the
// other action tests). This encodes the product rule: every user has a monthly
// allowance — the instance default when nothing else applies — and an admin can
// grant ONE user a different number, which metering must then honour. Otherwise
// granting credits does nothing.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
}));

/** No billing gate is mocked here, so no plan is in play and the ladder lands on
 *  the instance default: the shipped free-tier allowance, since the env seed is
 *  cleared in every case below. */
const INSTANCE_DEFAULT = PLAN_AI_CREDITS_PER_MONTH.free ?? 0;

describe("effectiveMonthlyAiCap — admin-granted per-user AI allowance", () => {
  afterEach(async () => {
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, ""); // clear between cases
    vi.unstubAllEnvs();
  });

  it("falls back to the instance default when no override is set", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
    expect(await effectiveMonthlyAiCap()).toBe(INSTANCE_DEFAULT);
  });

  it("honours an admin-granted positive integer allowance over the default", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");
    expect(await effectiveMonthlyAiCap()).toBe(25);
  });

  it("ignores invalid overrides (0, negative, fractional, non-numeric) and uses the default", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
    for (const bad of ["0", "-5", "2.5", "abc"]) {
      await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, bad);
      expect(await effectiveMonthlyAiCap()).toBe(INSTANCE_DEFAULT);
    }
  });
});
