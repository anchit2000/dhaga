import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPlanAllowanceOverrides, setPlanCapEnforcement } from "@/lib/repo/ai-budget";
import { PLAN_AI_CREDITS_PER_MONTH } from "@/utils/constants/plans";
import { clearActions, clearBudgetControls } from "../ai-action-metering/helpers";

/**
 * WHY THESE TESTS EXIST: a user with no credits left used to click an AI button,
 * wait, and get an error — `assertAiBudget` refusing after the fact.
 * `aiGateReason` is the pre-click half: it tells the UI to grey the AI controls
 * and say why. A disabled control with no explanation is worse than a failed
 * click, so the COPY is part of the contract, not decoration — which of the two
 * messages you get decides whether waiting for the month to roll over is
 * presented as a way out at all.
 *
 * The sibling file pins the other half: never gating someone the server would
 * have served, and never gating a path that spends no credits.
 */

const FREE_CREDITS = PLAN_AI_CREDITS_PER_MONTH.free ?? 0;
const billing = { unlimited: false };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => billing.unlimited,
    getPlanSummary: async () => ({ plan: "free", status: "active", hasStripeCustomer: false }),
  }),
}));

const { aiGateReason } = await import("@/lib/ai/gate");
const { recordAiAction, withAiAction } = await import("@/lib/ai/metering");

/** Completed actions, metered exactly as production meters them. */
async function spend(feature: "card_scan" | "enrichment", times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await withAiAction(feature, () =>
      recordAiAction(feature, "claude-haiku-4-5", { inputTokens: 100, outputTokens: 10 }),
    );
  }
}

beforeEach(async () => {
  billing.unlimited = false;
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key"); // an LLM IS configured
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearActions();
  await clearBudgetControls();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("aiGateReason — when the AI controls go grey", () => {
  it("does NOT gate a free user who still has this month's credits", async () => {
    await spend("card_scan");
    expect(await aiGateReason("user-1")).toBeNull();
  });

  it("gates the moment the month's credits run out, and says they come back", async () => {
    await spend("card_scan", FREE_CREDITS);
    const reason = await aiGateReason("user-1");
    // Waiting is a real way out of THIS state, so the copy must offer it rather
    // than making upgrading look like the only option.
    expect(reason).toContain("out of AI credits this month");
    expect(reason).toContain(`all ${FREE_CREDITS} used`);
    expect(reason).toContain("reset");
  });

  it("tells a plan with no credits at all that AI is a paid feature, not that it ran out", async () => {
    // An admin can zero a plan's allowance. "You've used all 0 credits" would be
    // nonsense — nothing was ever spent, and waiting changes nothing.
    await setPlanAllowanceOverrides({ free: 0 });
    const reason = await aiGateReason("user-1");
    expect(reason).toContain("No monthly AI credits on this plan");
    expect(reason).not.toContain("reset"); // waiting would not help
  });

  it("never gates an unlimited user, however much they have spent", async () => {
    await setPlanCapEnforcement(false); // switch off = the raw billing entitlement
    billing.unlimited = true;
    await spend("enrichment", 3);
    expect(await aiGateReason("user-1")).toBeNull();
  });

  it("stays out of the way when no LLM is configured — that degraded path owns its message", async () => {
    // A self-hosted instance with no API key already says "Configure an LLM
    // provider to …". Greying the same buttons for a second, credit-shaped
    // reason would make a working install look billed-out.
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await spend("card_scan", FREE_CREDITS);
    expect(await aiGateReason("user-1")).toBeNull();
  });
});
