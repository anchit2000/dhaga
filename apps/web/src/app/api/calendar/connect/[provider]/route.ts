import { getCalendarProvider } from "@dhaga/core";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { oauthBaseUrl, signState } from "@/lib/calendar/oauth";

/**
 * Starts the calendar OAuth flow: session-gated, then redirects the browser to
 * the provider's consent page with a signed state. The demo provider loops
 * straight back to the callback so the whole feature is exercisable without a
 * real OAuth app ("use dummy for now").
 *
 * Free/busy scopes ONLY unless `?upgrade=1` is present. That query flag is the
 * entire opt-in mechanism: it is set only by the explicit "Upgrade" control in
 * Settings, so connecting — or reconnecting — never silently broadens what a
 * user already granted, and an existing free/busy connection is never disturbed.
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
  const upgrade = new URL(request.url).searchParams.get("upgrade") === "1";
  const authUrl = provider.getAuthUrl({
    state: signState(providerId, userId),
    redirectUri,
    upgrade,
  });
  return Response.redirect(authUrl, 302);
}
