/**
 * Two-sided referral program constants (hosted / Dhaga Cloud only).
 * Reward: a free month of Pro for BOTH the advocate and the referee, granted
 * when the referee verifies their email (see packages/ee/src/referrals).
 */

/** Length of the granted Pro extension, in days. */
export const REFERRAL_REWARD_DAYS = 30;

/** Number of random chars in a referral code (uppercase base32-ish). */
export const REFERRAL_CODE_LENGTH = 8;

/** httpOnly cookie that carries a `?ref=` code from landing through signup. */
export const REFERRAL_COOKIE_NAME = "dhaga_ref";

/** Cookie lifetime (30 days) — an intent to sign up, not a session. */
export const REFERRAL_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30;

/** Landing query param that seeds the referral cookie: `/?ref=CODE`. */
export const REFERRAL_QUERY_PARAM = "ref";

/** Anti-abuse: max rewarded referrals a single advocate can earn. */
export const REFERRAL_MAX_REWARDS_PER_REFERRER = 50;

/** Env var holding the Stripe coupon id used to give paying referrers a free month. */
export const REFERRAL_STRIPE_COUPON_ENV = "STRIPE_REFERRAL_COUPON_ID";
