"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import {
  confirmEdgeSuggestion,
  dismissEdgeSuggestion,
  type EdgeSuggestionTarget,
} from "@/lib/repo/edge-suggestions";

/** Which target the confirm form chose. Person suggestions send `contactId`
 *  (empty = "none of these — create a new person"); entity suggestions send
 *  `entityId` to link an existing entity or `nodeTypeId` to create one. */
function targetFromForm(formData: FormData): EdgeSuggestionTarget {
  const entityId = String(formData.get("entityId") ?? "").trim();
  if (entityId) return { entityId };
  const nodeTypeId = String(formData.get("nodeTypeId") ?? "").trim();
  if (nodeTypeId) return { newEntity: { typeId: nodeTypeId } };
  const contactId = String(formData.get("contactId") ?? "").trim();
  return contactId ? { contactId } : { newContact: true };
}

export async function confirmEdgeSuggestionAction(formData: FormData): Promise<void> {
  await requireUserId();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  const target = targetFromForm(formData);
  const resolved = await confirmEdgeSuggestion(suggestionId, target);
  revalidatePath("/app");
  if (resolved?.dstType === "contact") revalidatePath(`/app/people/${resolved.dstId}`);
  if (resolved?.dstType === "entity") {
    // The id may have been minted inside the confirm flow ("create new …"),
    // which also adds a row to the entities list.
    revalidatePath("/app/entities");
    revalidatePath(`/app/entities/${resolved.dstId}`);
  }
}

export async function dismissEdgeSuggestionAction(formData: FormData): Promise<void> {
  await requireUserId();
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  await dismissEdgeSuggestion(suggestionId);
  revalidatePath("/app");
}
