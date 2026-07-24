import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { loadReferralInfo } from "@/lib/referral";
import type { ReferralApiResponse } from "@dhaga/core/src/api/referral";

/**
 * Advocate's own referral standing (code, invite link, rewarded/pending
 * counts) for the web page and the mobile app. `referral` is null on a
 * self-host / billing-off instance, where the feature is inert.
 *
 * Reuses the external-surface `capture` rate-limit bucket: the strict
 * `RateLimitBucket` union has no dedicated `referral` bucket and its constants
 * file is owned elsewhere, so this shares the mobile-facing bucket rather than
 * add one. (Follow-up: a dedicated `referral` bucket.)
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

  const referral = await loadReferralInfo(userId);
  const body: ReferralApiResponse = { referral };
  return Response.json(body);
}
