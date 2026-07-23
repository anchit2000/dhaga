import { getCalendarProvider } from "@dhaga/core";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { oauthBaseUrl, verifyState } from "@/lib/calendar/oauth";
import { saveCalendarConnection } from "@/lib/repo/calendar";

/**
 * OAuth callback: verifies the signed state, exchanges the code for tokens, and
 * stores the connection under the logged-in user (tokens encrypted at rest).
 * Always returns the user to Settings with a `calendar=` status the UI reads.
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
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) {
    return Response.redirect(new URL("/app/settings?calendar=error", base), 302);
  }
  if (!verifyState(state, providerId, userId)) {
    return Response.redirect(new URL("/app/settings?calendar=bad_state", base), 302);
  }
  try {
    const provider = getCalendarProvider(providerId);
    const redirectUri = new URL(`/api/calendar/callback/${providerId}`, base).toString();
    const tokens = await provider.exchangeCode({ code, redirectUri });
    await saveCalendarConnection({ provider: providerId, tokens });
  } catch {
    return Response.redirect(new URL("/app/settings?calendar=exchange_failed", base), 302);
  }
  return Response.redirect(new URL("/app/settings?calendar=connected", base), 302);
}
