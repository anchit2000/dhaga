"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { markReachedOut, setCadence } from "@/lib/repo/reminders";

function revalidate(contactId: string): void {
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}

export async function setCadenceAction(formData: FormData): Promise<void> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const raw = String(formData.get("days") ?? "");
  const days = Number(raw);
  await setCadence(contactId, raw && Number.isFinite(days) && days > 0 ? days : null);
  revalidate(contactId);
}

export async function markReachedOutAction(formData: FormData): Promise<void> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  await markReachedOut(contactId);
  revalidate(contactId);
}
