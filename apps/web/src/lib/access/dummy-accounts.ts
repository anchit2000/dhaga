import { DUMMY_EMAIL_DOMAIN, DUMMY_EMAILS, DUMMY_USER_IDS } from "@/utils/constants/dummy-accounts";

/**
 * True when the given account is a disposable test/demo account that must never
 * receive product emails. Robust to casing/whitespace and matches by either id
 * or email — reuse this for ANY recipient path (jobs, digests, future per-user
 * fan-out) so the exclusion stays in one place. See constants/dummy-accounts.ts.
 */
export function isDummyAccount(input: { email?: string | null; id?: string | null }): boolean {
  const id = input.id?.trim();
  if (id && DUMMY_USER_IDS.includes(id)) return true;

  const email = input.email?.trim().toLowerCase();
  if (!email) return false;
  // Domain match covers loadtest@ and every demo-*@dhaga.internal address.
  if (email.endsWith(DUMMY_EMAIL_DOMAIN)) return true;
  return DUMMY_EMAILS.includes(email);
}
