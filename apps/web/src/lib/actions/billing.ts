"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { getBillingGate, type PlanOffer } from "@/lib/hosted/gate";

/**
 * Reads the buyer's selection off the form. Anything unrecognised falls back
 * to Pro yearly rather than throwing — the form is ours and the values are
 * fixed, so a mismatch means a bug on our side, and the worst outcome is
 * sending someone to the wrong Checkout page (which they can simply cancel)
 * rather than a crashed settings screen.
 */
function selectionFrom(formData: FormData): PlanOffer {
  const tier = formData.get("plan") === "power" ? "power" : "pro";
  const cadence = formData.get("cadence") === "monthly" ? "monthly" : "yearly";
  return { plan: tier, cadence };
}

export async function createCheckoutSessionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const url = await (await getBillingGate()).createCheckoutUrl(userId, selectionFrom(formData));
  redirect(url);
}

export async function createBillingPortalSessionAction(): Promise<void> {
  const userId = await requireUserId();
  const url = await (await getBillingGate()).createPortalUrl(userId);
  redirect(url);
}

/**
 * Moves an EXISTING subscriber to another tier/cadence. Deliberately a
 * different action from createCheckoutSessionAction: this one never opens a
 * Checkout, so a subscriber can't end up paying two subscriptions. The gate
 * throws if the account has no live subscription to modify.
 *
 * No redirect — the change happens server-to-server at the processor, so the
 * page just re-renders with the new state (immediate) or the scheduled-change
 * line (deferred).
 */
export async function changePlanAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await (await getBillingGate()).changePlan(userId, selectionFrom(formData));
  revalidatePath("/app/settings");
}

export async function cancelPlanAction(): Promise<void> {
  const userId = await requireUserId();
  await (await getBillingGate()).cancelPlan(userId);
  revalidatePath("/app/settings");
}

export async function resumePlanAction(): Promise<void> {
  const userId = await requireUserId();
  await (await getBillingGate()).resumePlan(userId);
  revalidatePath("/app/settings");
}

export async function revertScheduledChangeAction(): Promise<void> {
  const userId = await requireUserId();
  await (await getBillingGate()).revertScheduledChange(userId);
  revalidatePath("/app/settings");
}
