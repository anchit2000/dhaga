import { cookies } from "next/headers";
import { REFERRAL_COOKIE_NAME } from "@/utils/constants/referral";

/**
 * Reads the invite code carried from an invite link through signup. Returns
 * null outside a request scope (e.g. under vitest, where there is no cookie
 * store) — callers treat that as "no referral".
 */
export async function readReferralCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(REFERRAL_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Best-effort cleanup once the referral has been recorded. A no-op when there
 * is no writable cookie store (vitest) or the enclosing handler owns a response
 * this mutation can't reach — recording is idempotent, so a leftover cookie is
 * harmless.
 */
export async function clearReferralCookie(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(REFERRAL_COOKIE_NAME);
  } catch {
    /* no writable cookie store — nothing to clear */
  }
}
