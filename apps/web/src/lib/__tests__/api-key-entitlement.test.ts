import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiKeyAction, deleteApiKeyAction } from "@/lib/actions/api-keys";
import { API_KEY_PLAN_GATE_REASON } from "@/utils/constants/api-keys";
import { PLAN_FEATURES } from "@/utils/constants/plans";

/**
 * WHY THESE TESTS EXIST: `multi_device_sync` sat in PLAN_FEATURES for months as
 * marketing copy nobody checked — listed on Pro and Power, enforced nowhere, so
 * a free account could add as many devices as it liked. A personal access token
 * is the ONLY way the browser extension, the mobile app and an MCP client
 * authenticate, so minting one is the honest definition of "another device" and
 * the one choke point where the entitlement can be enforced at all.
 *
 * These cases pin the three decisions that make the gate defensible rather than
 * merely present:
 *   1. a free account cannot mint (the gate is real — this is what regresses if
 *      `requireFeature` is ever dropped from the action);
 *   2. a paid account can (the gate must not become a wall for the people who
 *      paid for it);
 *   3. it fires on MINTING only — revoking stays open, because a lapsed plan
 *      taking away the ability to turn a live token off would be a security
 *      problem, not a monetisation one. Key VERIFICATION is ungated for the
 *      same reason and is not routed through this action at all.
 *
 * The copy is part of the contract too: the refusal has to name the plan and
 * promise existing tokens keep working, or a user reads a greyed-out button as
 * a bug in the extension.
 */

const plan = { value: "free" as "free" | "pro" | "power", billingRuns: true };

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "user-1",
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({ scopedDb: async () => null }),
  getBillingGate: async () => ({
    getPlanSummary: async () =>
      plan.billingRuns
        ? {
            plan: plan.value,
            status: "active",
            hasStripeCustomer: false,
            stripeEnabled: true,
            razorpayEnabled: false,
            offers: { stripe: [], razorpay: [] },
          }
        : null, // no processor configured — a self-host, no plan in play
  }),
}));

const minted = vi.fn(async () => ({ key: "dhaga_live_secret" }));
const revoked = vi.fn(async () => ({}));

vi.mock("@/lib/auth/config", () => ({
  getAuth: async () => ({
    api: { createApiKey: minted, deleteApiKey: revoked },
  }),
}));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  plan.value = "free";
  plan.billingRuns = true;
  minted.mockClear();
  revoked.mockClear();
});

describe("createApiKeyAction — the multi_device_sync payment gate", () => {
  it("refuses a free account, and never reaches better-auth to mint", async () => {
    const result = await createApiKeyAction({}, form({ name: "Extension" }));

    expect(result.key).toBeUndefined();
    expect(result.error).toBe(API_KEY_PLAN_GATE_REASON);
    // The refusal must happen BEFORE the key exists. A gate that minted and
    // then hid the value would leave an unusable row in the user's key list.
    expect(minted).not.toHaveBeenCalled();
  });

  it("tells the user which plan buys it, and that existing tokens survive", async () => {
    const { error } = await createApiKeyAction({}, form({}));
    // Without the plan name this reads as an outage; without the reassurance a
    // paying user who lapses assumes their extension has already been cut off.
    expect(error).toContain("Pro or Power");
    expect(error).toContain("keep working");
  });

  it("mints for a paid account", async () => {
    plan.value = "pro";
    const result = await createApiKeyAction({}, form({ name: "Extension" }));

    expect(result.error).toBeUndefined();
    expect(result.key).toBe("dhaga_live_secret");
    expect(minted).toHaveBeenCalledOnce();
  });

  it("mints on a self-host, where no plan is in play", async () => {
    // Nothing is for sale without a payment processor, so `currentPlan` resolves
    // to `self_hosted`. Reading "no billing" as "free" would lock a self-hoster
    // out of their own extension — the AGPL core has to stay whole.
    plan.billingRuns = false;
    const result = await createApiKeyAction({}, form({}));

    expect(result.key).toBe("dhaga_live_secret");
    expect(PLAN_FEATURES.self_hosted).toContain("multi_device_sync");
  });
});

describe("deleteApiKeyAction — deliberately outside the gate", () => {
  it("lets a free account revoke a token it still holds", async () => {
    // A downgrade must never strip the ability to turn off a live credential.
    await deleteApiKeyAction(form({ keyId: "key-1" }));
    expect(revoked).toHaveBeenCalledOnce();
  });
});
