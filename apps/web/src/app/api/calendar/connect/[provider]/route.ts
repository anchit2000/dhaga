import { getCalendarProvider } from "@dhaga/core";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { oauthBaseUrl, signState } from "@/lib/calendar/oauth";

/**
 * Starts the calendar OAuth flow: session-gated, then redirects the browser to
 * the provider's consent page with a signed state. The demo provider loops
 * straight back to the callback so the whole feature is exercisable without a
 * real OAuth app ("use dummy for now"). Read-only free/busy scopes only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const base = oauthBaseUrl(request);
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.redirect(new URL("/login", base), 302);
  }
  const { provider: providerId } = await params;
  let provider;
  try {
    provider = getCalendarProvider(providerId);
  } catch {
    return Response.redirect(new URL("/app/settings?calendar=unknown_provider", base), 302);
  }
  if (!provider.isConfigured()) {
    return Response.redirect(new URL("/app/settings?calendar=not_configured", base), 302);
  }
  const redirectUri = new URL(`/api/calendar/callback/${providerId}`, base).toString();
  const authUrl = provider.getAuthUrl({ state: signState(providerId, userId), redirectUri });
  return Response.redirect(authUrl, 302);
}
