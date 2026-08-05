"use server";

import { redirect } from "next/navigation";
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
  const plan = formData.get("plan");
  if (plan === "lifetime") return { plan: "lifetime" };
  const tier = plan === "power" ? "power" : "pro";
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
