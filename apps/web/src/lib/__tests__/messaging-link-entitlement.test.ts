import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateMessagingLinkTokenAction,
  unlinkMessagingIdentityAction,
} from "@/lib/actions/messaging";
import { MESSAGING_LINK_PLAN_GATE_REASON } from "@/utils/constants/messaging";

/**
 * WHY THESE TESTS EXIST: WhatsApp/Telegram capture is sold under
 * `multi_device_sync`, and a link token is the ONLY way a chat becomes a
 * capture channel — the webhook will not talk to an unlinked chat. So minting
 * one is the single honest choke point for "can this user connect another
 * channel", and the one place the entitlement can be enforced without touching
 * message delivery.
 *
 * The cases pin the three decisions that make the gate defensible:
 *   1. a free account cannot mint (the gate is real — this regresses the moment
 *      the `hasFeature` check is dropped from the action);
 *   2. a paid account can (the gate must not become a wall for the people who
 *      paid for it);
 *   3. UNLINKING stays open. Taking away someone's ability to disconnect a live
 *      channel that reads their messages is a privacy problem, not a
 *      monetisation one — the same argument that keeps `deleteApiKeyAction`
 *      ungated.
 *
 * Not pinned here because it is not routed through this module at all: inbound
 * processing for an already-linked chat. The webhook is deliberately ungated —
 * the user is still messaging a number we told them to message, and silently
 * dropping what they send loses their data rather than upselling them.
 */

// vi.hoisted, because the action's import graph pulls these modules in before
// plain top-level consts would have run (mutation.ts imports request-scope).
const { plan, createLinkToken, unlinkIdentity, withUserDb } = vi.hoisted(() => ({
  plan: { value: "free", billingRuns: true } as {
    value: "free" | "pro" | "power";
    billingRuns: boolean;
  },
  createLinkToken: vi.fn(),
  unlinkIdentity: vi.fn(),
  // mutation() runs its work inside a scoped tenant connection; the gate has to
  // have refused before that connection is ever checked out.
  withUserDb: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireUserId: async () => "user-1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/repo/messaging", () => ({ createLinkToken, unlinkIdentity }));
vi.mock("@/lib/db/request-scope", () => ({ withUserDb }));

vi.mock("@/lib/hosted/gate", () => ({
  getBillingGate: async () => ({
    getPlanSummary: async () =>
      plan.billingRuns
        ? { plan: plan.value, status: "active", hasStripeCustomer: false }
        : null, // no processor configured — a self-host, no plan in play
  }),
}));

beforeEach(() => {
  plan.value = "free";
  plan.billingRuns = true;
  createLinkToken.mockReset();
  unlinkIdentity.mockReset();
  withUserDb.mockReset();
  withUserDb.mockImplementation((_userId: string, work: () => Promise<unknown>) => work());
});

describe("generateMessagingLinkTokenAction — the multi_device_sync payment gate", () => {
  it("refuses a free account, and never mints a token row", async () => {
    const result = await generateMessagingLinkTokenAction();

    expect(result).toEqual({ ok: false, error: MESSAGING_LINK_PLAN_GATE_REASON });
    // A token written and then withheld would sit redeemable in the DB, so the
    // refusal has to land before the write, not after it.
    expect(createLinkToken).not.toHaveBeenCalled();
    expect(withUserDb).not.toHaveBeenCalled();
  });

  it("promises that chats already linked are untouched", async () => {
    const result = await generateMessagingLinkTokenAction();

    // Without this, someone whose plan lapses reads a greyed-out button as
    // "Dhaga has stopped reading my forwarded messages" and stops forwarding.
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("keep capturing");
  });

  it("mints for a paid account", async () => {
    plan.value = "pro";

    const result = await generateMessagingLinkTokenAction();

    expect(result.ok).toBe(true);
    expect(createLinkToken).toHaveBeenCalledOnce();
  });

  it("mints on a self-host, where no plan is in play", async () => {
    plan.billingRuns = false;

    expect((await generateMessagingLinkTokenAction()).ok).toBe(true);
  });
});

describe("unlinkMessagingIdentityAction — deliberately outside the gate", () => {
  it("lets a free account disconnect a chat it linked while paying", async () => {
    await unlinkMessagingIdentityAction("identity-1");

    expect(unlinkIdentity).toHaveBeenCalledOnce();
  });
});
