import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { effectiveMonthlyAiCap } from "@/lib/ai/metering";

// getCurrentUser=null makes request-scope fall back to the unscoped in-memory
// PGlite, so the settings write/read round-trips for real (same pattern as the
// other action tests). This encodes the product rule: cloud AI is a paid
// feature (free cap 0), but an admin can grant a per-user allowance ("credits")
// that metering must then honour — otherwise granting credits does nothing.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
}));

describe("effectiveMonthlyAiCap — admin-granted per-user AI allowance", () => {
  afterEach(async () => {
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, ""); // clear between cases
    vi.unstubAllEnvs();
  });

  it("falls back to the instance default (0) when no override is set", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
    expect(await effectiveMonthlyAiCap()).toBe(0);
  });

  it("honours an admin-granted positive integer allowance over the default", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", ""); // instance default would be 0
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");
    expect(await effectiveMonthlyAiCap()).toBe(25);
  });

  it("ignores invalid overrides (0, negative, fractional, non-numeric) and uses the default", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
    for (const bad of ["0", "-5", "2.5", "abc"]) {
      await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, bad);
      expect(await effectiveMonthlyAiCap()).toBe(0);
    }
  });
});
