import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_ACTION_CREDITS } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { setPlanAllowanceOverrides, setPlanCapEnforcement } from "@/lib/repo/ai-budget";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, setSetting } from "@/lib/repo/settings";
import { AI_ACTION_LABELS, AI_ACTIVITY_LIMIT } from "@/utils/constants/ai-credits";
import { clearActions, clearBudgetControls, seedGrant } from "./ai-action-metering/helpers";

/**
 * WHY THESE TESTS EXIST: the credits page tells a user where their money went.
 * A breakdown that does not add up to the headline, or that quietly omits the
 * free actions, is worse than no page at all — it turns "I trust the meter" into
 * "the meter is lying to me", which is the one thing a usage-metered product
 * cannot afford. Each case below pins one of those promises:
 *
 *   - the rows on screen sum to the total, and that total is the SAME number the
 *     monthly cap is enforced against (not a second, drifting count);
 *   - a 0-credit action is visible and costs nothing;
 *   - a make-good grant raises the allowance without rewriting history;
 *   - an unlimited plan reads as unlimited rather than dividing by a zero cap.
 */

const plan = { unlimited: true };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => plan.unlimited,
    getPlanSummary: async () => ({ plan: "pro", status: "active", hasStripeCustomer: true }),
  }),
}));

const { getAiCreditsOverview } = await import("@/lib/repo/ai-usage");
const { aiCreditsUsedThisMonth } = await import("@/lib/ai/metering");

/** Insert metered actions the way the AI paths do, but at a chosen instant so a
 *  case can straddle the month boundary the meter counts from. */
async function seedActions(feature: string, times: number, at: Date = new Date()): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < times; i += 1) {
    await db.execute(sql`
      insert into ai_actions (id, feature, model, input_tokens, output_tokens, created_at)
      values (${randomUUID()}, ${feature}, 'claude-haiku-4-5', 100, 20, ${at})
    `);
  }
}

beforeEach(async () => {
  plan.unlimited = false;
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "100");
  await clearActions();
  await clearBudgetControls();
  await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the breakdown is the total", () => {
  it("sums to the same number the monthly cap is enforced against", async () => {
    await seedActions("card_scan", 2);
    await seedActions("search", 1);
    await seedActions("enrichment", 1);

    const overview = await getAiCreditsOverview("user-1");
    const expected =
      2 * AI_ACTION_CREDITS.card_scan + AI_ACTION_CREDITS.search + AI_ACTION_CREDITS.enrichment;

    expect(overview.totalCredits).toBe(expected);
    expect(overview.breakdown.reduce((sum, row) => sum + row.credits, 0)).toBe(expected);
    // The page and the enforcement must never be able to disagree.
    expect(await aiCreditsUsedThisMonth()).toBe(overview.totalCredits);
    expect(overview.allowance.used).toBe(expected);
  });

  it("counts only this month, exactly where the meter draws the line", async () => {
    const now = new Date(Date.UTC(2026, 6, 20, 12, 0, 0));
    await seedActions("card_scan", 3, new Date(Date.UTC(2026, 6, 2)));
    await seedActions("card_scan", 5, new Date(Date.UTC(2026, 5, 28)));

    const overview = await getAiCreditsOverview("user-1", now);

    expect(overview.totalActions).toBe(3);
    expect(overview.totalCredits).toBe(3 * AI_ACTION_CREDITS.card_scan);
    // …but the bounded activity list is not month-scoped, so opening the page on
    // the 1st still shows what you last did.
    expect(overview.recent).toHaveLength(8);
    expect(overview.allowance.resetsAt.toISOString()).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString());
  });
});

describe("free actions", () => {
  it("shows watchlist scans without adding a credit to the total", async () => {
    await seedActions("card_scan", 1);
    await seedActions("signal_detection", 4);

    const overview = await getAiCreditsOverview("user-1");
    const watchlist = overview.breakdown.find((row) => row.feature === "signal_detection");

    expect(watchlist).toMatchObject({ count: 4, credits: 0, free: true });
    expect(watchlist?.label).toBe(AI_ACTION_LABELS.signal_detection.many);
    expect(overview.totalActions).toBe(5);
    expect(overview.totalCredits).toBe(AI_ACTION_CREDITS.card_scan);
  });
});

describe("grants", () => {
  it("raises the allowance without touching what was spent", async () => {
    // Pin the ceiling with the highest-precedence rung so this case tests the
    // grant layer itself, not whichever default the plan ladder happens to have.
    await setSetting(AI_MONTHLY_CAP_OVERRIDE_KEY, "100");
    await seedActions("card_scan", 3);
    const before = await getAiCreditsOverview("user-1");
    expect(before.allowance).toMatchObject({ cap: 100, base: 100, granted: 0, used: 3 });

    await seedGrant({ userId: "user-1", credits: 50, reason: "make-good" });
    const after = await getAiCreditsOverview("user-1");

    expect(after.allowance).toMatchObject({ cap: 150, base: 100, granted: 50, used: 3 });
    expect(after.allowance.remaining).toBe(147);
    // History is untouched — grants are additive on the ceiling, never a credit back.
    expect(after.totalCredits).toBe(before.totalCredits);
  });
});

describe("unlimited plans", () => {
  it("reads as unlimited rather than dividing by a zero cap", async () => {
    // A plan whose allowance is explicitly "no ceiling" — the shape the pricing
    // page sells, and the one case where `used / cap` would be a division by zero.
    plan.unlimited = true;
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
    await setPlanCapEnforcement(true);
    await setPlanAllowanceOverrides({ pro: null });
    await seedActions("brief", 2);

    const overview = await getAiCreditsOverview("user-1");

    expect(overview.allowance.unlimited).toBe(true);
    expect(overview.allowance.used).toBe(2 * AI_ACTION_CREDITS.brief);
    // The cap is meaningless here; what matters is that nothing derived from it
    // is NaN/Infinity, which is what a naive used/cap ratio would produce.
    expect(Number.isFinite(overview.allowance.cap)).toBe(true);
    expect(Number.isFinite(overview.allowance.remaining)).toBe(true);
  });
});

describe("recent activity", () => {
  it("is bounded and speaks in action names, never feature ids", async () => {
    await seedActions("card_scan", AI_ACTIVITY_LIMIT + 5);

    const overview = await getAiCreditsOverview("user-1");

    expect(overview.recent).toHaveLength(AI_ACTIVITY_LIMIT);
    expect(overview.recent[0]?.label).toBe(AI_ACTION_LABELS.card_scan.one);
    expect(overview.recent.some((row) => row.label.includes("_"))).toBe(false);
  });
});
