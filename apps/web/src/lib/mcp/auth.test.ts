import { beforeEach, describe, expect, it, vi } from "vitest";
import { userIdFromAuth, verifyMcpToken } from "./auth";

/**
 * Which credential opens the door to a user's whole private graph, and — more
 * importantly — which one does not. `/api/mcp` is the only endpoint we hand to
 * software written by strangers, so each rule here is pinned on its own.
 *
 * Resolving a credential is only half the door: the `multi_device_sync` plan
 * gate that runs on the resolved user lives in ./auth-plan-gate.test.ts.
 */

const getMcpSession = vi.fn();
const verifyApiKey = vi.fn();

vi.mock("@/lib/auth/config", () => ({
  getAuth: async () => ({ api: { getMcpSession, verifyApiKey } }),
}));

// ./auth reaches billing through @/lib/entitlements for the plan gate; these
// tests are about credentials only, so the gate is stubbed out of the way.
vi.mock("@/lib/hosted/gate", () => ({
  getBillingGate: async () => ({ getPlanSummary: async () => null }),
}));

beforeEach(() => {
  getMcpSession.mockReset();
  verifyApiKey.mockReset();
});

function request(headers: Record<string, string>): Request {
  return new Request("https://dhaga.test/api/mcp", { headers });
}

describe("verifyMcpToken", () => {
  it("turns a valid OAuth session into the user behind it", async () => {
    getMcpSession.mockResolvedValue({
      userId: "user-1",
      clientId: "client-abc",
      scopes: "profile email",
      accessTokenExpiresAt: new Date("2030-01-01T00:00:00Z"),
    });

    const info = await verifyMcpToken(request({ authorization: "Bearer tok" }), "tok");

    expect(info?.extra?.userId).toBe("user-1");
    // better-auth stores scopes as one space-separated string; MCP wants a
    // list, and `requiredScopes` checks would silently never match otherwise.
    expect(info?.scopes).toEqual(["profile", "email"]);
  });

  it("rejects a bearer token instead of falling back to x-api-key", async () => {
    // The dangerous shape: an expired or revoked OAuth token arriving on a
    // client that also still has a PAT configured. Falling through would keep
    // that client working long after the user revoked its OAuth grant, so a
    // presented-but-invalid bearer token has to be terminal.
    getMcpSession.mockResolvedValue(null);
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "user-1" } });

    const info = await verifyMcpToken(
      request({ authorization: "Bearer stale", "x-api-key": "pat" }),
      "stale",
    );

    expect(info).toBeUndefined();
    expect(verifyApiKey).not.toHaveBeenCalled();
  });

  it("accepts a personal access token when no bearer token was presented", async () => {
    // Local and stdio-only clients cannot run an OAuth round trip, so the PAT
    // the mobile app already uses has to keep working here.
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "user-2" } });

    const info = await verifyMcpToken(request({ "x-api-key": "pat" }));

    expect(info?.extra?.userId).toBe("user-2");
  });

  it("refuses a personal access token the plugin reports invalid", async () => {
    verifyApiKey.mockResolvedValue({ valid: false, key: null });

    expect(await verifyMcpToken(request({ "x-api-key": "revoked" }))).toBeUndefined();
  });

  it("refuses a request carrying no credential at all", async () => {
    // Returning undefined is what makes withMcpAuth answer 401 with the RFC
    // 9728 challenge — the challenge is how a client discovers where to log
    // in, so an anonymous request must never resolve to a user.
    expect(await verifyMcpToken(request({}))).toBeUndefined();
    expect(getMcpSession).not.toHaveBeenCalled();
    expect(verifyApiKey).not.toHaveBeenCalled();
  });
});

describe("userIdFromAuth", () => {
  it("throws rather than running a tool without a user", () => {
    // Every tool resolves its tenant from this value. Returning null instead
    // would let a repo call run on whatever scope happened to be ambient, which
    // is how one user's client ends up reading another user's graph.
    expect(() => userIdFromAuth(undefined)).toThrow();
    expect(() =>
      userIdFromAuth({ token: "t", clientId: "c", scopes: [], extra: {} }),
    ).toThrow();
  });
});
