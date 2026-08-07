import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "better-auth";
import { beforeUserCreate, grantOrRequestApproval } from "@/lib/auth/config";

// vi.mock is hoisted above these imports/consts by Vitest's transform; the
// `mock` prefix is what lets Vitest hoist these declarations along with it
// (see https://vitest.dev/api/vi.html#vi-mock — referencing a non-hoisted
// const here throws "Cannot access before initialization").
const mockCheckEmail = vi.fn();
const mockRequestAccess = vi.fn();
const mockApprove = vi.fn();
vi.mock("@/lib/hosted/gate", () => ({
  getSignupGate: async () => ({ checkEmail: mockCheckEmail, requestAccess: mockRequestAccess }),
  getApprovalGate: async () => ({ approve: mockApprove, isApproved: async () => false }),
}));

const mockNotifyAccessRequested = vi.fn();
vi.mock("@/lib/access/notify", () => ({
  notifyAccessRequested: (...args: [string]) => mockNotifyAccessRequested(...args),
}));

const mockReferralBypass = vi.fn();
vi.mock("@/lib/referral", () => ({
  isReferralBypassAllowed: () => mockReferralBypass(),
}));

// beforeUserCreate's single-user core guard queries the user table; an empty
// table means "first account", which lets these cases through unchanged.
vi.mock("@/lib/db", () => ({
  getDb: async () => ({
    select: () => ({ from: () => ({ limit: async () => [] }) }),
  }),
}));

function newUser(): User & Record<string, unknown> {
  return {
    id: "user_1",
    email: "someone@example.com",
    emailVerified: false,
    name: "Someone",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * "Model A: payment is the invite." The access wall used to sit in FRONT of
 * account creation — an unapproved email got an APIError("FORBIDDEN") and no
 * account at all. It now sits BEHIND it: anyone can sign up, the account is
 * created unapproved, and it reaches only /pending until an admin approves it
 * or a payment is confirmed.
 *
 * These tests encode WHY each half matters:
 *  - creation must never be refused for a business reason again, or the whole
 *    "pay to skip the queue" funnel has no account to sell to;
 *  - an unapproved signup must still file an access request, or the admin queue
 *    goes blind and nobody can ever be let in by hand;
 *  - an already-approved email must be approved AT signup, or someone an admin
 *    invited would land on the waiting list they were invited off.
 */
describe("signup under the pending-approval gate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRequestAccess.mockResolvedValue(true);
    mockReferralBypass.mockResolvedValue(false);
  });

  it("creates the account even for an email the gate has never seen", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Not on the list yet." });

    const user = newUser();
    await expect(beforeUserCreate(user)).resolves.toEqual({ data: user });
    // The gate is not consulted before creation at all any more.
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it("leaves an uninvited account unapproved and files its access request", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Not on the list yet." });

    await grantOrRequestApproval(newUser());

    expect(mockApprove).not.toHaveBeenCalled();
    expect(mockRequestAccess).toHaveBeenCalledWith("someone@example.com");
    expect(mockNotifyAccessRequested).toHaveBeenCalledWith("someone@example.com");
  });

  it("approves immediately when the email was already invited", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: true });

    await grantOrRequestApproval(newUser());

    expect(mockApprove).toHaveBeenCalledWith("user_1");
    expect(mockRequestAccess).not.toHaveBeenCalled();
  });

  // The wall is only worth having if a referral code can't walk around it: the
  // codes are shareable, so approving on one would let anyone holding a link
  // skip a queue that an admin or a *confirmed* payment is supposed to gate.
  // The referrer still earns their reward — EE's recordReferral is a separate
  // hook — but the invite buys a place in line, not a way past it.
  it("queues a referred signup instead of approving it, even with a valid invite code", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Not on the list yet." });
    mockReferralBypass.mockResolvedValue(true);

    await grantOrRequestApproval(newUser());

    expect(mockApprove).not.toHaveBeenCalled();
    expect(mockRequestAccess).toHaveBeenCalledWith("someone@example.com");
  });

  it("does not resend the confirmation for an already-pending request", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Still pending." });
    mockRequestAccess.mockResolvedValue(false);

    await grantOrRequestApproval(newUser());

    expect(mockNotifyAccessRequested).not.toHaveBeenCalled();
  });

  /**
   * The account already exists by the time this hook runs, so a failure in the
   * best-effort confirmation email must not surface as an error — better-auth
   * would turn it into a 500 on a signup that actually succeeded, and the user
   * would retry into a "email already registered" wall.
   */
  it("still completes when the confirmation email throws", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Not on the list yet." });
    mockNotifyAccessRequested.mockRejectedValue(new Error("Resend API error: 503"));

    await expect(grantOrRequestApproval(newUser())).resolves.toBeUndefined();
    expect(mockRequestAccess).toHaveBeenCalledWith("someone@example.com");
  });
});
