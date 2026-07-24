"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { setSubscriptionForUser, setAiCapOverrideFor } from "@dhaga/ee/admin";
import { requireUserId } from "@/lib/auth/guard";
import { getAdminGate } from "@/lib/hosted/gate";

type AdminPlan = "free" | "pro" | "lifetime";

function isAdminPlan(value: string): value is AdminPlan {
  return value === "free" || value === "pro" || value === "lifetime";
}

async function assertAdmin(): Promise<void> {
  const callerId = await requireUserId();
  if (!(await (await getAdminGate()).isAdmin(callerId))) throw new Error("Forbidden");
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

  await setSubscriptionForUser(userId, { plan, expiry });
  revalidatePath(`/app/admin/users/${userId}`);
  revalidatePath("/app/admin/subscriptions");
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
