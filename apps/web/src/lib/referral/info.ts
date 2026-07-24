import { REFERRAL_REWARD_DAYS } from "@/utils/constants/referral";
import { SITE_URL } from "@/utils/constants/site";
import type { ReferralSummary } from "@/lib/hosted/gate";
import type { ReferralInfo } from "@dhaga/core/src/api/referral";

/**
 * Shareable invite target: `${SITE_URL}/r/<code>`. The `/r/[code]` route drops
 * the referral cookie and lands the visitor on '/', so no `?ref=` query
 * handling is needed on the landing page itself.
 */
export function buildInviteUrl(code: string): string {
  return `${SITE_URL}/r/${code}`;
}

/**
 * Turns an EE referral summary into the client/mobile DTO by attaching the
 * web-assembled invite URL and the reward-length copy constant.
 */
export function buildReferralInfo(summary: ReferralSummary): ReferralInfo {
  return {
    code: summary.code,
    inviteUrl: buildInviteUrl(summary.code),
    rewardedCount: summary.rewardedCount,
    pendingCount: summary.pendingCount,
    rewardDays: REFERRAL_REWARD_DAYS,
  };
}
