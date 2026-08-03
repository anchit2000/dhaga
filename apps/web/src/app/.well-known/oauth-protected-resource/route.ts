import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";

/**
 * RFC 9728 protected-resource metadata for `/api/mcp`.
 *
 * This is the first thing a spec-compliant MCP client fetches after it gets a
 * 401 from the endpoint: it names which authorization server can issue tokens
 * for us. Without it the client has nowhere to send the user to log in, so a
 * connector would just fail with "unauthorized" and no way forward.
 *
 * The authorization server is this same deployment — `BETTER_AUTH_URL` is the
 * issuer better-auth's `mcp` plugin derives its own metadata from, so the two
 * documents have to agree on that origin exactly or clients reject the token.
 */
export const GET = protectedResourceHandler({
  authServerUrls: [process.env.BETTER_AUTH_URL ?? ""],
});

// Browser-based MCP clients preflight this document cross-origin.
export const OPTIONS = metadataCorsOptionsRequestHandler();
