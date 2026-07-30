import { getContactSyncProvider } from "@dhaga/core";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { oauthBaseUrl, signState } from "@/lib/calendar/oauth";
import { CONTACT_SYNC_STATE_PREFIX } from "@/utils/constants/contact-sync";

/**
 * Starts the contact-sync OAuth flow: session-gated, then redirects to the
 * provider's consent page with a signed state.
 *
 * The state helper is shared with the calendar flow (lib/calendar/oauth) rather
 * than duplicated — same HMAC, same TTL, same user binding. The provider string
 * it signs is namespaced (`contacts:google`, not `google`) so that a state
 * issued for the CALENDAR consent cannot be replayed against this callback to
 * save a calendar grant as a contacts connection, and vice versa.
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
    provider = getContactSyncProvider(providerId);
  } catch {
    return Response.redirect(new URL("/app/settings?contacts=unknown_provider", base), 302);
  }
  if (!provider.isConfigured()) {
    return Response.redirect(new URL("/app/settings?contacts=not_configured", base), 302);
  }

  const redirectUri = new URL(`/api/contact-sync/callback/${providerId}`, base).toString();
  const authUrl = provider.getAuthUrl({
    state: signState(`${CONTACT_SYNC_STATE_PREFIX}${providerId}`, userId),
    redirectUri,
  });
  return Response.redirect(authUrl, 302);
}
