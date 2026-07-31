import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { addFactAction, createFollowUpAction } from "@/lib/actions/manual-entries";
import { getDb } from "@/lib/db/request-scope";
import { extractionJobs, facts } from "@/lib/db/schema";
import { setPlanCapEnforcement } from "@/lib/repo/ai-budget";
import { createContact } from "@/lib/repo/contacts";
import { listOpenFollowUps } from "@/lib/repo/notes";
import { PLAN_AI_CREDITS_PER_MONTH } from "@/utils/constants/plans";
import { clearActions, clearBudgetControls } from "../ai-action-metering/helpers";

/**
 * The two ways greying a button is WORSE than the failed click it replaces:
 *
 *   1. Gating someone the server would have served. `assertAiBudget` refuses on
 *      `used >= cap` and never looks at what the action costs, so a user with a
 *      few credits left is genuinely allowed to start a 20-credit deep research
 *      and go over. A per-action-price gate would grey a button that works.
 *   2. Gating a path that spends no credits. Manual facts, follow-ups and typed
 *      notes are the whole free/no-AI experience (docs/TESTING.md §8) — greying
 *      those would read as a broken app, not as a plan limit.
 */

const FREE_CREDITS = PLAN_AI_CREDITS_PER_MONTH.free ?? 0;

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    hasUnlimitedAi: async () => false,
    getPlanSummary: async () => ({ plan: "free", status: "active", hasStripeCustomer: false }),
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { aiGateReason } = await import("@/lib/ai/gate");
const { AiBudgetError, assertAiBudget, recordAiAction, withAiAction } = await import(
  "@/lib/ai/metering"
);

async function spend(feature: "card_scan" | "enrichment", times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await withAiAction(feature, () =>
      recordAiAction(feature, "claude-haiku-4-5", { inputTokens: 100, outputTokens: 10 }),
    );
  }
}

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
  vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "");
  await clearActions();
  await clearBudgetControls();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("aiGateReason agrees with assertAiBudget, which is the enforcement", () => {
  it("does not gate on price: 5 credits left still buys a 20-credit deep research", async () => {
    await setPlanCapEnforcement(false);
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "25");
    await spend("enrichment"); // 20 of 25

    expect(await aiGateReason("user-1")).toBeNull();
    await expect(
      withAiAction("enrichment", () => assertAiBudget("user-1")),
    ).resolves.toBeUndefined();
  });

  it("gates exactly when — and only when — the server would refuse", async () => {
    await setPlanCapEnforcement(false);
    vi.stubEnv("DHAGA_AI_MONTHLY_CAP", "25");
    await spend("enrichment", 2); // 40 of 25 — over

    expect(await aiGateReason("user-1")).not.toBeNull();
    await expect(
      withAiAction("card_scan", () => assertAiBudget("user-1")),
    ).rejects.toBeInstanceOf(AiBudgetError);
  });
});

describe("a user at zero credits can still run the whole app by hand", () => {
  it("adds a fact and a follow-up with nothing left in the budget", async () => {
    await spend("card_scan", FREE_CREDITS);
    expect(await aiGateReason("user-1")).not.toBeNull();

    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Zero Credits Zoya" },
      "manual",
    );

    const fact = await addFactAction(
      {},
      formData({ contactId, type: "personal", text: "Runs marathons" }),
    );
    expect(fact.error).toBeUndefined();

    const followUp = await createFollowUpAction(
      {},
      formData({ contactId, action: "Send the deck" }),
    );
    expect(followUp.error).toBeUndefined();

    const db = await getDb();
    expect(await db.select().from(facts).where(eq(facts.contactId, contactId))).toHaveLength(1);
    expect(await listOpenFollowUps(contactId)).toHaveLength(1);

    // None of it queued a metered action or an extraction job: the gate is still
    // closed afterwards, so nothing was quietly billed to get here.
    expect(
      await db.select().from(extractionJobs).where(eq(extractionJobs.contactId, contactId)),
    ).toHaveLength(0);
    expect(await aiGateReason("user-1")).not.toBeNull();
  });
});
