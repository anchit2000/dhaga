/**
 * Types-only contract for the **two-sided referral** program (a free month of
 * Pro for both advocate and referee).
 *
 * Deep-import directly (`@dhaga/core/src/api/referral`), never the package
 * barrel, to keep server SDKs out of the mobile/RN bundle. No runtime code.
 *
 * Rewards are a hosted (Dhaga Cloud) concern — they extend a `subscriptions`
 * row that only exists under packages/ee. Self-hosted mode is single-user, so
 * this whole surface is inert there (the API returns `referral: null`).
 */

export interface ReferralInfo {
  /** The advocate's stable, shareable code. */
  code: string;
  /** Fully-built invite link (SITE_URL + `/r/<code>`), assembled web-side. */
  inviteUrl: string;
  /** Referrals that have qualified and been rewarded. */
  rewardedCount: number;
  /** Referees who signed up via this code but haven't qualified yet. */
  pendingCount: number;
  /** Length of the granted Pro extension, in days (for UI copy). */
  rewardDays: number;
}

/** Response of GET /api/referral. `referral` is null when unavailable (self-host / billing off). */
export interface ReferralApiResponse {
  referral: ReferralInfo | null;
}
