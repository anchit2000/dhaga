import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "better-auth";
import { beforeUserCreate } from "@/lib/auth/config";

// vi.mock is hoisted above these imports/consts; the `mock` prefix is what
// lets Vitest hoist the declarations along with it.
const mockLimit = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: async () => ({
    select: () => ({ from: () => ({ limit: () => mockLimit() }) }),
  }),
}));

const mockCheckEmail = vi.fn();
const mockRequestAccess = vi.fn();
vi.mock("@/lib/hosted/gate", () => ({
  getSignupGate: async () => ({ checkEmail: mockCheckEmail, requestAccess: mockRequestAccess }),
}));

vi.mock("@/lib/access/notify", () => ({
  notifyAccessRequested: async () => undefined,
}));

function newUser(): User & Record<string, unknown> {
  return {
    id: "user_2",
    email: "second@example.com",
    emailVerified: false,
    name: "Second User",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * The AGPL core ships no per-user data isolation — one unscoped connection
 * over one shared graph (lib/db/request-scope.ts). That is only safe for a
 * single account, so beforeUserCreate must refuse a second signup when hosted
 * mode is off. This test encodes WHY: a second core account would silently
 * read the first user's contacts, notes, and facts. RLS scoping that makes
 * multi-user safe lives exclusively in packages/ee (hosted mode).
 */
describe("single-user core guard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckEmail.mockResolvedValue({ allowed: true });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a second account when hosted mode is off", async () => {
    vi.stubEnv("DHAGA_HOSTED_MODE", "");
    mockLimit.mockResolvedValue([{ id: "user_1" }]); // an account already exists

    await expect(beforeUserCreate(newUser())).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
    // The guard fires before the signup gate — no email/gate work happens.
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it("allows the first account when hosted mode is off", async () => {
    vi.stubEnv("DHAGA_HOSTED_MODE", "");
    mockLimit.mockResolvedValue([]); // empty table — this is the first user

    const user = newUser();
    await expect(beforeUserCreate(user)).resolves.toEqual({ data: user });
  });

  it("does not enforce single-user in hosted mode (packages/ee owns isolation)", async () => {
    vi.stubEnv("DHAGA_HOSTED_MODE", "true");
    mockLimit.mockResolvedValue([{ id: "user_1" }]); // would block if the guard ran

    const user = newUser();
    await expect(beforeUserCreate(user)).resolves.toEqual({ data: user });
    // Guard short-circuits before touching the DB when hosted mode is on.
    expect(mockLimit).not.toHaveBeenCalled();
  });
});
