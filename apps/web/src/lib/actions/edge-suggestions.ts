"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import {
  confirmEdgeSuggestion,
  dismissEdgeSuggestion,
} from "@/lib/repo/edge-suggestions";

/**
 * Confirm a pending relationship. A `contactId` links it to that existing
 * contact; an empty one means "none of these — create a new person".
 */
export async function confirmEdgeSuggestionAction(formData: FormData): Promise<void> {
  await requireUserId();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  const contactId = String(formData.get("contactId") ?? "").trim();
  if (!suggestionId) return;
  await confirmEdgeSuggestion(
    suggestionId,
    contactId ? { contactId } : { newContact: true },
  );
  revalidatePath("/app");
  if (contactId) revalidatePath(`/app/people/${contactId}`);
}

export async function dismissEdgeSuggestionAction(formData: FormData): Promise<void> {
  await requireUserId();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  await dismissEdgeSuggestion(suggestionId);
  revalidatePath("/app");
}
