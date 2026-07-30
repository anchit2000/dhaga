import { getContactSyncProvider } from "@dhaga/core";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { oauthBaseUrl, verifyState } from "@/lib/calendar/oauth";
import { withUserDb } from "@/lib/db/request-scope";
import { saveContactConnection } from "@/lib/repo/contact-sync";
import { CONTACT_SYNC_STATE_PREFIX } from "@/utils/constants/contact-sync";

/**
 * Completes the contact-sync OAuth flow.
 *
 * The state is verified against the CURRENT session's user id, not just its
 * signature. That closes the connection-injection hole where an attacker
 * completes consent on their own account and replays their signed state plus
 * code into a victim's session, which would store the attacker's tokens — and
 * therefore their address book — under the victim's user.
 *
 * Nothing from the provider's error responses is echoed into the redirect: the
 * body can quote account data, and this URL ends up in browser history.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const base = oauthBaseUrl(request);
  const settings = (status: string) =>
    Response.redirect(new URL(`/app/settings?contacts=${status}`, base), 302);

  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.redirect(new URL("/login", base), 302);
  }

  const { provider: providerId } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // The user declining consent arrives here with `error` and no code — a normal
  // outcome, not a failure to report loudly.
  if (url.searchParams.get("error")) return settings("cancelled");
  if (!code || !state) return settings("failed");
  if (!verifyState(state, `${CONTACT_SYNC_STATE_PREFIX}${providerId}`, userId)) {
    return settings("bad_state");
  }

  let provider;
  try {
    provider = getContactSyncProvider(providerId);
  } catch {
    return settings("unknown_provider");
  }

  try {
    const redirectUri = new URL(`/api/contact-sync/callback/${providerId}`, base).toString();
    const tokens = await provider.exchangeCode({ code, redirectUri });
    // The exchange is a network call and finishes BEFORE the DB scope opens —
    // a tenant connection is never held across an HTTP round trip.
    await withUserDb(userId, () => saveContactConnection({ provider: providerId, tokens }));
  } catch {
    return settings("failed");
  }

  return settings("connected");
}
