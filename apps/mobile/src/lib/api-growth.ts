import type { ReferralApiResponse } from "@dhaga/core/src/api/referral";
import type { WrappedApiResponse, WrappedScope } from "@dhaga/core/src/api/wrapped";
import type { MobileSettings } from "@/types";
import { CaptureError, errorMessage } from "@/lib/api";

/**
 * Growth-feature reads (Network Wrapped + referral) over the same thin-client
 * transport as lib/api.ts. Split out so lib/api.ts stays under the 150-line
 * rule; reuses CaptureError + errorMessage from there (no duplicate transport).
 * Never logs the returned figures or invite details.
 */

/**
 * GET /api/wrapped with the user's own API key — the contact-free "network in
 * review" figures plus a public, unfurlable share URL for the chosen scope.
 */
export async function getWrapped(
  settings: MobileSettings,
  scope?: WrappedScope,
): Promise<WrappedApiResponse> {
  // Built by hand (not URLSearchParams) so we don't depend on RN's polyfill.
  const parts: string[] = [];
  if (scope) {
    parts.push(`kind=${encodeURIComponent(scope.kind)}`);
    if (scope.eventId) parts.push(`eventId=${encodeURIComponent(scope.eventId)}`);
    if (scope.anchor) parts.push(`anchor=${encodeURIComponent(scope.anchor)}`);
  }
  const query = parts.length ? `?${parts.join("&")}` : "";
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}/api/wrapped${query}`, {
      headers: { "x-api-key": settings.apiKey },
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `Couldn't load your Wrapped (HTTP ${response.status}).`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  return (await response.json()) as WrappedApiResponse;
}

/**
 * GET /api/referral with the user's own API key — the advocate's code, invite
 * link and reward counts. `referral` is null when the server has referrals off
 * (self-host / billing disabled).
 */
export async function getReferral(
  settings: MobileSettings,
): Promise<ReferralApiResponse> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}/api/referral`, {
      headers: { "x-api-key": settings.apiKey },
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `Couldn't load your invite details (HTTP ${response.status}).`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  return (await response.json()) as ReferralApiResponse;
}
