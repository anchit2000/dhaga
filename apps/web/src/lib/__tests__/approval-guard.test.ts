import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsApproved = vi.fn();
vi.mock("@/lib/hosted/gate", () => ({
  getApprovalGate: async () => ({ isApproved: mockIsApproved, approve: async () => undefined }),
}));

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/config", () => ({
  getAuth: async () => ({ api: { getSession: mockGetSession, verifyApiKey: async () => ({ valid: false }) } }),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

const guard = await import("@/lib/auth/guard");

/**
 * The pending-approval gate is enforced in the three auth guards and nowhere
 * else — roughly 120 routes, pages and server actions go through them. That is
 * the point: a check each call site has to remember is a check that gets
 * forgotten, and one forgotten call site hands an unapproved account the whole
 * app. These tests pin the enforcement to the guards so it cannot be quietly
 * moved back out into individual callers.
 *
 * requireUserIdAllowingPending is the deliberate exception (the /pending screen
 * and the checkout that pays for it). It must stay session-only, or a pending
 * user has no way to buy their way in and the "payment is the invite" funnel
 * has no door.
 */
describe("approval enforcement in the auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user_1" } });
  });

  it("lets an approved account through every guard", async () => {
    mockIsApproved.mockResolvedValue(true);
    await expect(guard.requireUserId()).resolves.toBe("user_1");
    await expect(guard.requireUserIdForPage()).resolves.toBe("user_1");
    await expect(guard.requireUserIdFromRequest(new Request("https://x/"))).resolves.toBe("user_1");
  });

  it("redirects an unapproved account off any page to /pending", async () => {
    mockIsApproved.mockResolvedValue(false);
    await expect(guard.requireUserIdForPage()).rejects.toMatchObject({ to: "/pending" });
  });

  it("refuses an unapproved account in server actions and API routes", async () => {
    mockIsApproved.mockResolvedValue(false);
    await expect(guard.requireUserId()).rejects.toThrow(/waiting for approval/i);
    await expect(guard.requireUserIdFromRequest(new Request("https://x/"))).rejects.toThrow(
      /waiting for approval/i,
    );
  });

  it("still requires a session before it considers approval", async () => {
    mockIsApproved.mockResolvedValue(true);
    mockGetSession.mockResolvedValue(null);
    await expect(guard.requireUserId()).rejects.toThrow("Unauthorized");
    await expect(guard.requireUserIdForPage()).rejects.toMatchObject({ to: "/login" });
  });

  it("lets a pending account reach the pay-to-enter path", async () => {
    mockIsApproved.mockResolvedValue(false);
    await expect(guard.requireUserIdAllowingPending()).resolves.toBe("user_1");
    await expect(
      guard.requireUserIdFromRequestAllowingPending(new Request("https://x/")),
    ).resolves.toBe("user_1");
  });
});
