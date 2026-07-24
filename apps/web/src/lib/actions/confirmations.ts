"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import {
  dismissConfirmation,
  resolveConfirmation,
  type ConfirmationChoice,
} from "@/lib/repo/confirmations";

/**
 * Resolve one pending confirmation — the ONLY place the graph is mutated for
 * this feed. `choice` carries the user's pick (a link target or subject
 * contact); enrichment_match / supplement need none. `contactId` is the row's
 * subject, threaded from the view so its page revalidates too. On top of that,
 * revalidate whatever the resolver actually wrote so the affected person/entity
 * page reflects the new edge/fact immediately.
 */
export async function resolveConfirmationAction(
  id: string,
  choice?: ConfirmationChoice,
  contactId?: string | null,
): Promise<void> {
  await requireUserId();
  if (!id) return;
  const result = await resolveConfirmation(id, choice);
  revalidatePath("/app/confirmations");
  revalidatePath("/app");
  if (contactId) revalidatePath(`/app/people/${contactId}`);
  if (result?.kind === "edge") {
    if (result.dstType === "contact") revalidatePath(`/app/people/${result.dstId}`);
    else if (result.dstType === "entity") {
      revalidatePath("/app/entities");
      revalidatePath(`/app/entities/${result.dstId}`);
    }
  } else if (result?.kind === "extraction") {
    revalidatePath(`/app/people/${result.contactId}`);
  }
}

/** Reject a pending confirmation (the repo deletes an enrichment_match's fact;
 *  every other type is a pure state flip). Revalidate the inbox, Home, and the
 *  subject's page when known. */
export async function dismissConfirmationAction(
  id: string,
  contactId?: string | null,
): Promise<void> {
  await requireUserId();
  if (!id) return;
  await dismissConfirmation(id);
  revalidatePath("/app/confirmations");
  revalidatePath("/app");
  if (contactId) revalidatePath(`/app/people/${contactId}`);
}
