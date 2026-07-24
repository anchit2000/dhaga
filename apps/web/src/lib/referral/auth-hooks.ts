import { getReferralGate } from "@/lib/hosted/gate";
import { clearReferralCookie, readReferralCookie } from "./cookie";

/**
 * Signup allowlist bypass: a genuinely valid invite code lets a new referee
 * past the access-request wall (hosted mode only). Anti-abuse — self-referral,
 * duplicates, the per-referrer cap — is enforced authoritatively by the EE
 * gate's `recordReferral` at record time; this only trusts a valid code.
 * Never throws: a failure here just means "no bypass", preserving the normal
 * allowlist path.
 */
export async function isReferralBypassAllowed(): Promise<boolean> {
  try {
    const code = await readReferralCookie();
    if (!code) return false;
    return await (await getReferralGate()).isValidCode(code);
  } catch {
    return false;
  }
}

/**
 * Records the pending referrer→referee link at signup, then clears the cookie.
 * Best-effort: never throws, so a referral failure can't block signup. No-op
 * when no code is present or referrals are unavailable on this instance.
 */
export async function recordReferralFromCookie(
  refereeUserId: string,
  refereeEmail: string,
): Promise<void> {
  try {
    const code = await readReferralCookie();
    if (!code) return;
    await (await getReferralGate()).recordReferral({ code, refereeUserId, refereeEmail });
    await clearReferralCookie();
  } catch {
    /* best-effort — signup must never fail on referral wiring */
  }
}

/**
 * Fires the two-sided reward once the referee qualifies (email verified, or an
 * already-verified OAuth signup). Idempotent in the EE gate; best-effort here
 * so it can never throw into the auth flow.
 */
export async function grantReferralRewardOnVerification(refereeUserId: string): Promise<void> {
  try {
    await (await getReferralGate()).grantRewardOnVerification(refereeUserId);
  } catch (error) {
    console.error("referral reward grant failed", error);
  }
}
