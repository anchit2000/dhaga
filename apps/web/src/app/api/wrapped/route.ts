import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { getNetworkWrapped } from "@/lib/repo/wrapped";
import { buildWrappedShareUrl } from "@/lib/wrapped/sign";
import { isWrappedScopeKind, WRAPPED_DEFAULT_SCOPE_KIND } from "@/lib/wrapped/scope";
import type { WrappedApiResponse, WrappedScope } from "@dhaga/core/src/api/wrapped";

/**
 * Owner-only Network Wrapped stats + share URL (web studio; later mobile). The
 * response carries `reveal` (owner-only, name-bearing) but the shareUrl/token
 * it returns is contact-free by construction — names never enter it.
 */
export async function GET(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  try {
    await enforceRateLimit(userId, "capture");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: "Too many requests — slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } },
      );
    }
    throw error;
  }

  const searchParams = new URL(request.url).searchParams;
  const kind = searchParams.get("kind") ?? WRAPPED_DEFAULT_SCOPE_KIND;
  if (!isWrappedScopeKind(kind)) {
    return Response.json({ error: "Unknown scope." }, { status: 400 });
  }
  const eventId = searchParams.get("eventId") ?? undefined;
  if (kind === "event" && !eventId) {
    return Response.json({ error: "Missing eventId." }, { status: 400 });
  }
  const scope: WrappedScope = {
    kind,
    eventId,
    anchor: searchParams.get("anchor") ?? undefined,
  };

  const stats = await getNetworkWrapped(scope);
  const body: WrappedApiResponse = { stats, shareUrl: buildWrappedShareUrl(stats) };
  return Response.json(body);
}
