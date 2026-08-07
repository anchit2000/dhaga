"use server";

import { revalidatePath } from "next/cache";
import { markReachedOut, setCadence } from "@/lib/repo/reminders";
import { MutationError, mutation } from "@/lib/actions/mutation";
import type { CadenceSelectors, CadenceUpdateResult } from "@/types";

function revalidate(contactId: string): void {
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}

function optionalInteger(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : Number.NaN;
}

export async function setCadenceAction(formData: FormData): Promise<CadenceUpdateResult> {
  const contactId = String(formData.get("contactId") ?? "");
  const raw = String(formData.get("days") ?? "");
  const days = Number(raw);
  const cadence = raw && Number.isFinite(days) && days > 0 ? days : null;
  const selectors: CadenceSelectors = {
    weekday: optionalInteger(formData, "weekday"),
    monthDay: optionalInteger(formData, "monthDay"),
    month: optionalInteger(formData, "month"),
  };
  const confirmOverCapacity = formData.get("confirmOverCapacity") === "true";
  const r = await mutation("setCadence", async () => {
    if (!contactId || Object.values(selectors).some((value) => value !== null && Number.isNaN(value))) {
      throw new MutationError("Choose a valid keep-in-touch schedule.");
    }
    return setCadence(contactId, cadence, selectors, confirmOverCapacity);
  });
  if (!r.ok) throw new Error(r.error);
  if (r.data.persisted) revalidate(contactId);
  return r.data;
}

export async function markReachedOutAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const r = await mutation("markReachedOut", () => markReachedOut(contactId));
  if (!r.ok) throw new Error(r.error);
  revalidate(contactId);
}
