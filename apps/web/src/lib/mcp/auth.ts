import type { AuthInfo } from "@modelcontextprotocol/server";
import { getAuth } from "@/lib/auth/config";

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
