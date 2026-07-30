import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPromotion } from "@/lib/repo/ai-budget";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { actionCount, clearActions, clearBudgetControls, seedGrant } from "./helpers";

/**
 * WHY THESE TESTS EXIST:
 *
 * 1. "Everyone gets 1000 credits this month" has to be a thing an operator can
 *    do once and forget. If ending it needed a second admin action, the month it
 *    was meant to be generous for would quietly become a month of unlimited
 *    spend — so expiry is evaluated against the stored window on every read.
 *
 * 2. Making people whole after a bug must never edit `ai_actions`. That table is
 *    the only record of what cloud AI actually cost; rewriting it to fix a
 *    customer-service problem destroys the cost history the whole credit model is
 *    derived from. A grant is therefore ADDITIVE and orthogonal: the ceiling
 *    moves, recorded usage does not.
 */

const DAY = 86_400_000;

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => false, // a free-tier user: cap 0 without help
    getPlanSummary: async () => null, // billing isn't running — no plan in play
  }),
}));

const { aiCreditsUsedThisMonth, effectiveMonthlyAiCap, recordAiAction, withAiAction } =
  await import("@/lib/ai/metering");

beforeEach(async () => {
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearActions();
  await clearBudgetControls();
  await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a promotional month lifts everyone, then ends by itself", () => {
  it("raises a free-tier user from 0 to the promotional allowance", async () => {
    expect(await effectiveMonthlyAiCap("user-1")).toBe(0); // AI is a paid feature

    await setPromotion({
      credits: 1000,
      startsAt: new Date(Date.now() - DAY).toISOString(),
      endsAt: new Date(Date.now() + DAY).toISOString(),
      note: "launch month",
    });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(1000);
  });

  it("stops applying once its window has passed, with no admin action", async () => {
    await setPromotion({
      credits: 1000,
      startsAt: new Date(Date.now() - 30 * DAY).toISOString(),
      endsAt: new Date(Date.now() - DAY).toISOString(),
      note: "last month's promo, never cleaned up",
    });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(0);
  });

  it("does not apply before it starts", async () => {
    await setPromotion({
      credits: 1000,
      startsAt: new Date(Date.now() + DAY).toISOString(),
      endsAt: new Date(Date.now() + 30 * DAY).toISOString(),
      note: "scheduled for next week",
    });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(0);
  });
});

describe("a grant is additive and never rewrites what was spent", () => {
  it("raises the ceiling while leaving recorded usage byte-identical", async () => {
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "100");
    await withAiAction("enrichment", () =>
      recordAiAction("enrichment", "claude-sonnet-5", { inputTokens: 156, outputTokens: 2189 }),
    );

    const usedBefore = await aiCreditsUsedThisMonth();
    const rowsBefore = await actionCount();
    expect(usedBefore).toBe(20); // one deep-research action

    await seedGrant({ userId: null, credits: 50, reason: "make-good for the extraction bug" });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(150);
    // The whole point: the make-good is visible in the ceiling, invisible in the
    // cost record. A "reset everyone's usage" would have zeroed both of these.
    expect(await aiCreditsUsedThisMonth()).toBe(usedBefore);
    expect(await actionCount()).toBe(rowsBefore);
  });

  it("stacks on top of a per-user override rather than replacing it", async () => {
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "25");
    await seedGrant({ userId: "user-1", credits: 10, reason: "goodwill" });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(35);
  });

  it("stops counting once it expires", async () => {
    await seedGrant({
      userId: null,
      credits: 500,
      reason: "expired make-good",
      startsAt: new Date(Date.now() - 30 * DAY),
      endsAt: new Date(Date.now() - DAY),
    });

    expect(await effectiveMonthlyAiCap("user-1")).toBe(0);
  });
});
