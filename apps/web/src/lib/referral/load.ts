import { getReferralGate } from "@/lib/hosted/gate";
import { buildReferralInfo } from "./info";
import type { ReferralInfo } from "@dhaga/core/src/api/referral";

/**
 * Advocate-facing referral info for both the API route and the /app/referral
 * page. `getSummary()` is the availability gate — null on self-host / billing
 * off — and MUST be checked before `getOrCreateCode()`, which throws on a
 * core-only instance. `getOrCreateCode()` returns the canonical code
 * (minted on first read).
 */
export async function loadReferralInfo(userId: string): Promise<ReferralInfo | null> {
  const gate = await getReferralGate();
  const summary = await gate.getSummary(userId);
  if (!summary) return null;
  const code = await gate.getOrCreateCode(userId);
  return buildReferralInfo({ ...summary, code });
}
