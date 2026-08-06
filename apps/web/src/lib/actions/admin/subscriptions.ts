"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { getSubscription, getUser, setSubscriptionForUser, setAiCapOverrideFor } from "@dhaga/ee/admin";
import { notifyPlanChanged } from "@/lib/admin/notify";
import { assertAdmin } from "./guard";

type AdminPlan = "free" | "pro" | "power";

function isAdminPlan(value: string): value is AdminPlan {
  return value === "free" || value === "pro" || value === "power";
}

export async function setSubscriptionAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (!userId || !isAdminPlan(plan)) return;

  const rawExpiry = String(formData.get("expiry") ?? "").trim();
  let expiry: Date | null = null;
  if (rawExpiry) {
    const parsed = new Date(rawExpiry);
    if (Number.isNaN(parsed.getTime())) return;
    expiry = parsed;
  }

  // Read the CURRENT plan before writing so we only email on an actual plan
  // change, not a no-op save (e.g. only the expiry was edited).
  const previousPlan = (await getSubscription(userId))?.plan ?? "free";
  await setSubscriptionForUser(userId, { plan, expiry });
  revalidatePath(`/app/admin/users/${userId}`);
  revalidatePath("/app/admin/subscriptions");
  if (previousPlan !== plan) {
    const user = await getUser(userId);
    if (user) await notifyPlanChanged(user.email, plan);
  }
}

export async function setAiCreditsAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const rawCredits = String(formData.get("credits") ?? "").trim();
  let credits: number | null = null;
  if (rawCredits) {
    const parsed = Number(rawCredits);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    // 0 clears the override (falls back to the plan/free-tier cap).
    credits = parsed > 0 ? parsed : null;
  }

  await setAiCapOverrideFor(userId, credits);
  revalidatePath(`/app/admin/users/${userId}`);
}
