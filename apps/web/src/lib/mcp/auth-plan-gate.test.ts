import { beforeEach, describe, expect, it, vi } from "vitest";
import { MCP_PLAN_GATE_ERROR } from "@/utils/constants/mcp";
import { PLAN_FEATURES } from "@/utils/constants/plans";
import { mcpPlanGateResponse, verifyMcpToken } from "./auth";

/**
 * WHY THESE TESTS EXIST: MCP is sold as part of `multi_device_sync`, and the
 * only enforcement of that feature used to be on MINTING a personal access
 * token. That covers nothing here — a claude.ai or ChatGPT connector negotiates
 * its own OAuth bearer token through better-auth's `mcp` plugin and never sees
 * a PAT, so a free account could wire its whole private graph into an external
 * model at no cost. The gate therefore has to sit on the RESOLVED USER,
 * downstream of both credential branches.
 *
 * Each case runs the real `verifyMcpToken` first rather than hand-building an
 * `AuthInfo`: the regression being guarded against is precisely "one branch got
 * gated and the other didn't", which a hand-built object cannot catch.
 *
 * The refusal's SHAPE is part of the contract too. A 401 (what returning
 * `undefined` from the verifier would produce) tells a client to re-authenticate
 * — a loop that can never succeed, because the credential was never the problem.
 */

const getMcpSession = vi.fn();
const verifyApiKey = vi.fn();
const plan = { value: "free" as "free" | "pro" | "power", billingRuns: true };

vi.mock("@/lib/auth/config", () => ({
  getAuth: async () => ({ api: { getMcpSession, verifyApiKey } }),
}));

vi.mock("@/lib/hosted/gate", () => ({
  getBillingGate: async () => ({
    getPlanSummary: async () =>
      plan.billingRuns
        ? { plan: plan.value, status: "active", hasStripeCustomer: false }
        : null, // no processor configured — a self-host, no plan in play
  }),
}));

beforeEach(() => {
  getMcpSession.mockReset();
  verifyApiKey.mockReset();
  plan.value = "free";
  plan.billingRuns = true;
});

function request(headers: Record<string, string>): Request {
  return new Request("https://dhaga.test/api/mcp", { headers });
}

async function refusalFor(
  headers: Record<string, string>,
  bearer?: string,
): Promise<Response | null> {
  return mcpPlanGateResponse(await verifyMcpToken(request(headers), bearer));
}

describe("mcpPlanGateResponse — the multi_device_sync gate on MCP itself", () => {
  it("refuses a free account arriving over OAuth", async () => {
    // The branch token-minting can never reach: no PAT is involved at all.
    getMcpSession.mockResolvedValue({ userId: "user-1", clientId: "claude.ai", scopes: "" });

    expect((await refusalFor({ authorization: "Bearer tok" }, "tok"))?.status).toBe(403);
  });

  it("refuses the same account arriving with a personal access token", async () => {
    // A PAT can outlive the plan that bought it — key verification and
    // `deleteApiKeyAction` are deliberately ungated so a downgrade never breaks
    // a live integration. That leniency must not become a second way in.
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "user-1" } });

    expect((await refusalFor({ "x-api-key": "pat" }))?.status).toBe(403);
  });

  it("names a machine-readable reason a client can act on, not `invalid_token`", async () => {
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "user-1" } });

    const body = await (await refusalFor({ "x-api-key": "pat" }))?.json();

    expect(body.error).toBe(MCP_PLAN_GATE_ERROR);
    // Re-authenticating cannot fix a plan, so it must not look like it could.
    expect(body.error).not.toBe("invalid_token");
    // Naming the plan is what makes the refusal actionable rather than a wall.
    expect(body.error_description).toContain("Pro or Power");
  });

  it("lets a paid account through on either credential", async () => {
    plan.value = "pro";
    getMcpSession.mockResolvedValue({ userId: "user-1", clientId: "claude.ai", scopes: "" });
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "user-1" } });

    expect(await refusalFor({ authorization: "Bearer tok" }, "tok")).toBeNull();
    expect(await refusalFor({ "x-api-key": "pat" })).toBeNull();
  });

  it("lets a self-host through, where no plan is in play", async () => {
    // No payment processor means `currentPlan()` resolves to `self_hosted`,
    // which holds every feature. Reading "no billing" as "free" would lock a
    // self-hoster out of their own MCP endpoint — the AGPL core stays whole.
    plan.billingRuns = false;
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "user-1" } });

    expect(await refusalFor({ "x-api-key": "pat" })).toBeNull();
    expect(PLAN_FEATURES.self_hosted).toContain("multi_device_sync");
  });
});
