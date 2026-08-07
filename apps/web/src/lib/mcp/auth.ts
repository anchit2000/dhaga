import type { AuthInfo } from "@modelcontextprotocol/server";
import { getAuth } from "@/lib/auth/config";
import { isUserApproved } from "@/lib/auth/guard";
import { hasFeature } from "@/lib/entitlements";
import {
  MCP_APPROVAL_GATE_ERROR,
  MCP_APPROVAL_GATE_REASON,
  MCP_PLAN_GATE_ERROR,
  MCP_PLAN_GATE_REASON,
} from "@/utils/constants/mcp";

/**
 * Resolves the Dhaga user behind an MCP request. Two credentials are accepted,
 * because the two client families can't use the same one:
 *
 * - **OAuth 2.1 bearer** (`Authorization: Bearer …`) — issued by our own
 *   better-auth `mcp` plugin. This is what claude.ai / ChatGPT connectors and
 *   any spec-compliant client negotiate on their own; the user never copies a
 *   secret around.
 * - **`x-api-key` personal access token** — the same PAT the mobile app and
 *   `/api/follow-ups` already take (Settings → API keys). This is the escape
 *   hatch for local/stdio clients and self-hosters who don't want to stand up
 *   an OAuth round trip.
 *
 * `mcp-handler`'s `withMcpAuth` calls this on every request even when there is
 * no bearer token, which is what lets the PAT branch exist at all. Returning
 * `undefined` makes it answer 401 with the RFC 9728 `WWW-Authenticate`
 * challenge that points clients at our protected-resource metadata.
 */
export async function verifyMcpToken(
  request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const auth = await getAuth();

  if (bearerToken) {
    const session = await auth.api.getMcpSession({ headers: request.headers });
    if (session?.userId) {
      return {
        token: bearerToken,
        clientId: session.clientId,
        // better-auth stores scopes as one space-separated string.
        scopes: session.scopes ? session.scopes.split(" ").filter(Boolean) : [],
        expiresAt: session.accessTokenExpiresAt
          ? Math.floor(new Date(session.accessTokenExpiresAt).getTime() / 1000)
          : undefined,
        extra: { userId: session.userId },
      };
    }
    // A bearer token that doesn't resolve is a hard failure — don't silently
    // fall through to the PAT branch and mask an expired token.
    return undefined;
  }

  const key = request.headers.get("x-api-key");
  if (!key) return undefined;

  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) return undefined;

  return {
    token: key,
    clientId: "dhaga-personal-access-token",
    scopes: [],
    extra: { userId: result.key.referenceId },
  };
}

/**
 * The `multi_device_sync` payment gate for MCP itself (utils/constants/plans.ts).
 *
 * It runs on the resolved `AuthInfo`, which is what makes it cover BOTH
 * credentials with one check: gating token minting
 * (`lib/actions/api-keys.ts`) does nothing to an OAuth connector, since that
 * client negotiates its own bearer token and never touches a PAT. By the time
 * `withMcpAuth({ required: true })` hands a request on, either branch of
 * `verifyMcpToken` has produced the same `AuthInfo`, so there is exactly one
 * place left where both are the same thing.
 *
 * WHY IT ISN'T INSIDE `verifyMcpToken`, which is the obvious spot: neither exit
 * that function has can say this. Returning `undefined` produces a 401 with the
 * RFC 9728 challenge, which tells a client to send the user back through login
 * — a loop that can never succeed, because the credential was never the
 * problem. And `withMcpAuth` catches everything the verifier throws (including
 * an `OAuthError`) and rewrites it to the same 401 `invalid_token`, logging it
 * as an unexpected error. So the gate has to sit one step later, where it can
 * answer 403 with a body that names the real reason.
 *
 * Returns the refusal `Response`, or null when the user may proceed.
 */
export async function mcpPlanGateResponse(
  authInfo: AuthInfo | undefined,
): Promise<Response | null> {
  if (await hasFeature(userIdFromAuth(authInfo), "multi_device_sync")) return null;
  return Response.json(
    { error: MCP_PLAN_GATE_ERROR, error_description: MCP_PLAN_GATE_REASON },
    { status: 403 },
  );
}

/**
 * The approval gate for MCP. Sibling of the plan gate above and runs before it,
 * because "your account isn't approved" outranks "your plan doesn't include
 * this" — an unapproved user can't act on an upgrade prompt.
 *
 * MCP needs its own call because it never touches `lib/auth/guard`: it resolves
 * its own credentials in `verifyMcpToken`, so the approval check every other
 * entry point inherits from `requireUserId` doesn't reach here. Without this, a
 * connected client keeps working after a refund or chargeback revokes access.
 *
 * Returns the refusal `Response`, or null when the user may proceed.
 */
export async function mcpApprovalGateResponse(
  authInfo: AuthInfo | undefined,
): Promise<Response | null> {
  if (await isUserApproved(userIdFromAuth(authInfo))) return null;
  return Response.json(
    { error: MCP_APPROVAL_GATE_ERROR, error_description: MCP_APPROVAL_GATE_REASON },
    { status: 403 },
  );
}

/**
 * Pulls the user id back out of the `AuthInfo` that `withMcpAuth` attached.
 * Throws rather than returning null: every tool callback runs behind
 * `required: true`, so a missing user id is a wiring bug, not a 401 we should
 * be papering over inside a tool result.
 */
export function userIdFromAuth(authInfo: AuthInfo | undefined): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("MCP request reached a tool without an authenticated user.");
  }
  return userId;
}
