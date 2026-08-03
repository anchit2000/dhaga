import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { RateLimitError, enforceRateLimit } from "@/lib/ratelimit";
import {
  DHAGA_MCP_INSTRUCTIONS,
  DHAGA_MCP_SERVER_INFO,
  registerDhagaTools,
  userIdFromAuth,
  verifyMcpToken,
} from "@/lib/mcp";

/**
 * The Model Context Protocol endpoint — how an external AI client (Claude,
 * ChatGPT, Cursor, or anything else that speaks MCP) reads and writes this
 * user's graph on their behalf.
 *
 * Why this exists as its own route rather than as more `/api/*` endpoints:
 * MCP is a negotiated protocol, not just JSON over HTTP. The client discovers
 * the tool list, their schemas, and their descriptions at connect time, which
 * is what lets a model it has never seen before use the graph correctly
 * without us shipping an integration per client.
 *
 * Auth is `required: true`, so an unauthenticated request gets a 401 carrying
 * the RFC 9728 `WWW-Authenticate` challenge that points at our
 * protected-resource metadata — that challenge is how a spec-compliant client
 * discovers where to send the user to log in. Both credential types are
 * resolved in `verifyMcpToken`.
 *
 * Node runtime: the tool handlers reach Postgres through the `pg` pool.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(registerDhagaTools, {
  serverInfo: DHAGA_MCP_SERVER_INFO,
  instructions: DHAGA_MCP_INSTRUCTIONS,
});

/**
 * Per-user burst guard, applied after auth so the bucket is keyed to a real
 * user rather than an IP. An autonomous client issues tool calls far faster
 * than a person clicks and retries tools it didn't like, and every read takes
 * one of the three tenant connections — so this protects the pool the rest of
 * the app shares, not just this endpoint.
 */
async function rateLimited(request: Request): Promise<Response> {
  try {
    await enforceRateLimit(userIdFromAuth(request.auth), "mcp");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: "Too many requests to Dhaga — slow down and try again in a moment." },
        {
          status: 429,
          headers: { "retry-after": String(Math.ceil(error.retryAfterMs / 1000)) },
        },
      );
    }
    throw error;
  }
  return handler(request);
}

const authenticated = withMcpAuth(rateLimited, verifyMcpToken, { required: true });

export { authenticated as GET, authenticated as POST, authenticated as DELETE };
