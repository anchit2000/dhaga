import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { getAuth } from "@/lib/auth/config";

/**
 * RFC 8414 authorization-server metadata.
 *
 * better-auth's `mcp` plugin mounts the actual OAuth endpoints under the auth
 * catch-all (`/api/auth/mcp/authorize`, `/token`, `/register`), but clients
 * look for this document at the origin root — so this route republishes what
 * the plugin already knows rather than restating any of it by hand.
 *
 * Dynamic client registration is live at `/api/auth/mcp/register`, which is
 * what today's connectors use. The 2026-07-28 MCP spec supersedes DCR with
 * Client ID Metadata Documents; better-auth 1.6 does not advertise CIMD yet,
 * so that lands when better-auth ships it.
 */
export async function GET(request: Request): Promise<Response> {
  return oAuthDiscoveryMetadata(await getAuth())(request);
}

// Browser-based MCP clients preflight this document cross-origin.
export const OPTIONS = metadataCorsOptionsRequestHandler();
