"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { getBillingGate } from "@/lib/hosted/gate";

export async function createCheckoutSessionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const plan = formData.get("plan") === "lifetime" ? "lifetime" : "pro";
  const url = await (await getBillingGate()).createCheckoutUrl(userId, plan);
  redirect(url);
}

export async function createBillingPortalSessionAction(): Promise<void> {
  const userId = await requireUserId();
  const url = await (await getBillingGate()).createPortalUrl(userId);
  redirect(url);
}
