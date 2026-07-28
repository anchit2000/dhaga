"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { mutation } from "@/lib/actions/mutation";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
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
  if (!id) return;
  // One scoped connection for the whole resolve (the applier fans out several
  // getDb() reads/writes) — see GOAL 1 in the sweep contract. On failure, throw
  // so the client ConfirmationButton's catch surfaces a toast (never the
  // full-page error boundary).
  const r = await mutation("resolveConfirmation", () => resolveConfirmation(id, choice));
  if (!r.ok) throw new Error(r.error);
  const result = r.data;
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
  } else if (result?.kind === "note") {
    // The note is already attached and the row resolved inside the mutation
    // scope above. Run fact extraction HERE — after that scope released — so no
    // tenant connection is held across the LLM call (mirrors the note-attach
    // path in quick-add.ts). extractAndApplyNote maps its own errors to
    // outcomes (never throws), so a failed extraction never un-attaches the note.
    const userId = await requireUserId();
    await extractAndApplyNote(
      userId,
      result.contactId,
      result.noteId,
      result.contactName,
      result.noteBody,
    );
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
  if (!id) return;
  // Single scoped connection (dismiss may delete an enrichment fact + flip the
  // row — two getDb() reads/writes). Throw on failure so the client toasts.
  const r = await mutation("dismissConfirmation", () => dismissConfirmation(id));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/confirmations");
  revalidatePath("/app");
  if (contactId) revalidatePath(`/app/people/${contactId}`);
}
