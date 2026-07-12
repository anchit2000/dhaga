import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "better-auth";
import { beforeUserCreate } from "@/lib/auth/config";

// vi.mock is hoisted above these imports/consts by Vitest's transform; the
// `mock` prefix is what lets Vitest hoist these declarations along with it
// (see https://vitest.dev/api/vi.html#vi-mock — referencing a non-hoisted
// const here throws "Cannot access before initialization").
const mockCheckEmail = vi.fn();
const mockRequestAccess = vi.fn();
vi.mock("@/lib/hosted/gate", () => ({
  getSignupGate: async () => ({ checkEmail: mockCheckEmail, requestAccess: mockRequestAccess }),
}));

const mockNotifyAccessRequested = vi.fn();
vi.mock("@/lib/access/notify", () => ({
  notifyAccessRequested: (...args: [string]) => mockNotifyAccessRequested(...args),
}));

function blockedUser(): User & Record<string, unknown> {
  return {
    id: "user_1",
    email: "blocked@example.com",
    emailVerified: false,
    name: "Blocked User",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Signup for an unapproved email files an access request and sends up to
 * two best-effort confirmation emails (lib/access/notify.ts), then rejects
 * the signup with APIError("FORBIDDEN", ...) so the user sees "request
 * received" rather than an account. Before this fix, notifyAccessRequested
 * was awaited directly: if the email provider hiccuped (a transient Resend
 * API error or network failure — see lib/email/send.ts), that exception
 * replaced the intended FORBIDDEN rejection with an unrelated, unhandled
 * error. The signup UI would show a raw 500 instead of the graceful
 * "we've received your request" message, purely because of an outage in a
 * detail (the confirmation email) the user never sees either way.
 */
describe("beforeUserCreate signup hook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRequestAccess.mockResolvedValue(true);
  });

  it("still rejects with FORBIDDEN when the confirmation email throws", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Not on the list yet." });
    mockRequestAccess.mockResolvedValue(undefined);
    mockNotifyAccessRequested.mockRejectedValue(new Error("Resend API error: 503"));

    await expect(beforeUserCreate(blockedUser())).rejects.toMatchObject({
      status: "FORBIDDEN",
    });

    // The access request itself must still have been filed — only the
    // best-effort notification is allowed to fail silently.
    expect(mockRequestAccess).toHaveBeenCalledWith("blocked@example.com");
  });

  it("still rejects with the gate's own reason when the email send succeeds", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Not on the list yet." });
    mockRequestAccess.mockResolvedValue(undefined);
    mockNotifyAccessRequested.mockResolvedValue(undefined);

    await expect(beforeUserCreate(blockedUser())).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: { message: "Not on the list yet." },
    });
  });

  it("allows the signup through when the gate allows the email", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: true });

    const user = blockedUser();
    await expect(beforeUserCreate(user)).resolves.toEqual({ data: user });
    expect(mockRequestAccess).not.toHaveBeenCalled();
    expect(mockNotifyAccessRequested).not.toHaveBeenCalled();
  });

  it("does not resend confirmation for an existing pending request", async () => {
    mockCheckEmail.mockResolvedValue({ allowed: false, reason: "Still pending." });
    mockRequestAccess.mockResolvedValue(false);

    await expect(beforeUserCreate(blockedUser())).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
    expect(mockNotifyAccessRequested).not.toHaveBeenCalled();
  });
});
