"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { endAiCreditGrantNow, getUser, grantAiCredits } from "@dhaga/ee/admin";
import { notifyCreditsGranted } from "@/lib/admin/notify";
import { withUserDb } from "@/lib/db/request-scope";
import {
  setPlanAllowanceOverrides,
  setPlanCapEnforcement,
  setPromotion,
} from "@/lib/repo/ai-budget";
import { AI_ALLOWANCE_PLANS } from "@/utils/constants/ai-budget";
import type { AiPlanAllowances, AiPromotion } from "@/types";
import { assertAdmin } from "./guard";

const ADMIN_AI_CREDITS_PATH = "/app/admin/ai-credits";

function parseDate(raw: FormDataEntryValue | null): Date | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCount(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * The master switch for plan-cap enforcement. ON is the shipped default and
 * makes the credit ladder below authoritative. Turning it OFF drops back to the
 * raw billing entitlement (`hasUnlimitedAi`) plus the instance default — an
 * escape hatch, not a resting state.
 */
export async function setPlanCapEnforcementAction(formData: FormData): Promise<void> {
  const adminId = await assertAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  await withUserDb(adminId, () => setPlanCapEnforcement(enabled));
  revalidatePath(ADMIN_AI_CREDITS_PATH);
}

/**
 * Per-plan monthly allowances, Free included. Per plan: the "No cap" checkbox
 * wins when checked (stores null); otherwise a non-empty, valid `credits_*`
 * number is stored; otherwise (blank, unchecked) nothing is written and the
 * constant in utils/constants/plans.ts applies again (the constants stay the
 * defaults). An unusable number is left unset rather than silently coerced —
 * the admin sees it snap back to the default.
 *
 * Setting Free to anything also retires `DHAGA_AI_MONTHLY_CAP`: the free
 * allowance IS the instance default, and env only seeds it while unset (see
 * `instanceDefaultCap` in lib/ai/metering/cap/instance-default.ts). Reverting
 * Free to "Use default" hands the seed back.
 */
export async function setPlanAllowancesAction(formData: FormData): Promise<void> {
  const adminId = await assertAdmin();
  const allowances: AiPlanAllowances = {};
  for (const plan of AI_ALLOWANCE_PLANS) {
    if (formData.get(`nocap_${plan}`) === "on") {
      allowances[plan] = null;
      continue;
    }
    const credits = parseCount(formData.get(`credits_${plan}`));
    if (credits !== null) allowances[plan] = credits;
  }
  await withUserDb(adminId, () => setPlanAllowanceOverrides(allowances));
  revalidatePath(ADMIN_AI_CREDITS_PATH);
}

/**
 * The instance-wide promotional month. Blank credits clears it. Expiry is a
 * stored timestamp compared at read time, so the promotion ends by itself.
 */
export async function setPromotionAction(formData: FormData): Promise<void> {
  const adminId = await assertAdmin();
  const credits = parseCount(formData.get("credits"));
  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));

  let promotion: AiPromotion | null = null;
  if (credits !== null) {
    if (!startsAt || !endsAt || endsAt <= startsAt) return;
    promotion = {
      credits,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      note: String(formData.get("note") ?? "").trim().slice(0, 200),
    };
  }
  await withUserDb(adminId, () => setPromotion(promotion));
  revalidatePath(ADMIN_AI_CREDITS_PATH);
}

/**
 * Additive make-good credits for one user (`userId` set) or for everyone
 * (blank). Never touches `ai_actions` — recorded usage stays exactly as spent,
 * which is the whole point: the ledger explains the difference instead of the
 * cost history being rewritten to hide it.
 */
export async function grantAiCreditsAction(formData: FormData): Promise<void> {
  const adminId = await assertAdmin();
  const credits = parseCount(formData.get("credits"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (credits === null || credits <= 0 || !reason) return;

  const userId = String(formData.get("userId") ?? "").trim();
  const endsAt = parseDate(formData.get("endsAt"));
  const trimmedReason = reason.slice(0, 200);
  await grantAiCredits({
    userId: userId || null,
    credits,
    reason: trimmedReason,
    grantedBy: adminId,
    endsAt,
  });
  revalidatePath(ADMIN_AI_CREDITS_PATH);
  if (userId) {
    revalidatePath(`/app/admin/users/${userId}`);
    const user = await getUser(userId);
    if (user) await notifyCreditsGranted(user.email, credits, trimmedReason, endsAt);
  }
  // A blank userId is a broadcast grant (everyone on the instance) — emailing
  // the whole user base is a separate feature, not this action's job, so it's
  // deliberately skipped here rather than left as a TODO.
}

/** Stop a grant applying from now on. Not a delete — the ledger row survives. */
export async function endAiCreditGrantAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("grantId") ?? "").trim();
  if (!id) return;
  await endAiCreditGrantNow(id);
  revalidatePath(ADMIN_AI_CREDITS_PATH);
  const userId = String(formData.get("userId") ?? "").trim();
  if (userId) revalidatePath(`/app/admin/users/${userId}`);
}
