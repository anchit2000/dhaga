"use server";

import { revalidatePath } from "next/cache";
import { markReachedOut, setCadence } from "@/lib/repo/reminders";
import { mutation } from "@/lib/actions/mutation";

function revalidate(contactId: string): void {
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}

export async function setCadenceAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const raw = String(formData.get("days") ?? "");
  const days = Number(raw);
  const cadence = raw && Number.isFinite(days) && days > 0 ? days : null;
  const r = await mutation("setCadence", () => setCadence(contactId, cadence));
  if (!r.ok) throw new Error(r.error);
  revalidate(contactId);
}

export async function markReachedOutAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const r = await mutation("markReachedOut", () => markReachedOut(contactId));
  if (!r.ok) throw new Error(r.error);
  revalidate(contactId);
}
