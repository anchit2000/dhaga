import { getUserEmail } from "../billing/repo";
import { normalizeCode } from "./code";
import {
  countRewardedFor,
  findCode,
  findPendingReferralByReferee,
  getOrCreateCode,
  insertPendingReferral,
  markRewarded,
  summaryFor,
} from "./repo";
import { grantReferralReward } from "./reward";

/**
 * Max rewarded referrals a single advocate can earn. Mirrors
 * REFERRAL_MAX_REWARDS_PER_REFERRER in apps/web/src/utils/constants/referral.ts
 * — packages/ee must not import from apps/web (open-core boundary), so the
 * literal is duplicated. Keep in sync.
 */
const MAX_REWARDS_PER_REFERRER = 50;

/**
 * Two-sided referral reward engine (Dhaga Cloud). Structurally matches the
 * ReferralGate contract in apps/web/src/lib/hosted/gate.ts — packages/ee
 * can't import that type (open-core boundary is one-directional), so this is a
 * plain object the app consumes structurally (see apps/web/src/types/dhaga-ee.d.ts).
 */
export const referralGate = {
  getOrCreateCode(userId: string): Promise<string> {
    return getOrCreateCode(userId);
  },

  getSummary(
    userId: string,
  ): Promise<{ code: string; rewardedCount: number; pendingCount: number }> {
    return summaryFor(userId);
  },

  async isValidCode(code: string): Promise<boolean> {
    const normalized = normalizeCode(code);
    if (!normalized) return false;
    return (await findCode(normalized)) !== null;
  },

  async recordReferral(input: {
    code: string;
    refereeUserId: string;
    refereeEmail: string;
  }): Promise<{ recorded: boolean; reason?: string }> {
    const code = normalizeCode(input.code);
    if (!code) return { recorded: false, reason: "invalid-code" };

    const referrerUserId = await findCode(code);
    if (!referrerUserId) return { recorded: false, reason: "invalid-code" };

    // Self-referral: the same account by id, or a referee signing up with the
    // code owner's own email (a second account for the same person).
    if (referrerUserId === input.refereeUserId) {
      return { recorded: false, reason: "self-referral" };
    }
    const referrerEmail = await getUserEmail(referrerUserId);
    if (
      referrerEmail &&
      referrerEmail.trim().toLowerCase() === input.refereeEmail.trim().toLowerCase()
    ) {
      return { recorded: false, reason: "self-referral" };
    }

    // Anti-abuse: cap how many rewards one advocate can earn.
    if ((await countRewardedFor(referrerUserId)) >= MAX_REWARDS_PER_REFERRER) {
      return { recorded: false, reason: "referrer-cap-reached" };
    }

    const inserted = await insertPendingReferral({
      code,
      referrerUserId,
      refereeUserId: input.refereeUserId,
      refereeEmail: input.refereeEmail,
    });
    if (!inserted) return { recorded: false, reason: "already-recorded" };
    return { recorded: true };
  },

  async grantRewardOnVerification(refereeUserId: string): Promise<{ rewarded: boolean }> {
    const pending = await findPendingReferralByReferee(refereeUserId);
    if (!pending) return { rewarded: false };

    // Grant BOTH sides BEFORE marking rewarded: if a grant throws (e.g. the
    // Stripe coupon isn't configured), the referral stays pending to retry
    // rather than being silently half-rewarded. Fail loud (Rule 12).
    try {
      const referrerKind = await grantReferralReward(pending.referrerUserId);
      const refereeKind = await grantReferralReward(pending.refereeUserId);
      await markRewarded(pending.id, `referrer=${referrerKind};referee=${refereeKind}`);
      return { rewarded: true };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`referral reward failed for referral ${pending.id}: ${detail}`);
    }
  },
};
