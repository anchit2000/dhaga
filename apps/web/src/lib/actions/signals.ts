"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import {
  claimSignalForNote,
  dismissSignal,
  toggleWatch,
  type ToggleWatchResult,
} from "@/lib/repo/signals";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { mutation } from "@/lib/actions/mutation";

function revalidate(contactId: string): void {
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}

export async function toggleWatchAction(
  _previous: ToggleWatchResult,
  formData: FormData,
): Promise<ToggleWatchResult> {
  const contactId = String(formData.get("contactId") ?? "");
  const watch = formData.get("watch") === "true";
  if (!contactId) return { ok: false, error: "Missing contact." };
  const r = await mutation("toggleWatch", (userId) =>
    toggleWatch(userId, contactId, watch),
  );
  if (!r.ok) return { ok: false, error: r.error };
  revalidate(contactId);
  // toggleWatch itself may return a plan/cap rejection (ok:false) without
  // throwing — surface that business outcome verbatim.
  return r.data;
}

export async function dismissSignalAction(formData: FormData): Promise<void> {
  const signalId = String(formData.get("signalId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!signalId) return;
  const r = await mutation("dismissSignal", () => dismissSignal(signalId));
  if (!r.ok) throw new Error(r.error);
  revalidate(contactId);
}

/**
 * Turns an alert into a receipted note (BRD §7.5: enrichment-style findings
 * are always attributed and always deletable) — the signal itself is never
 * written to the graph directly.
 */
export async function addSignalAsNoteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const signalId = String(formData.get("signalId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const contactName = String(formData.get("contactName") ?? "");
  if (!signalId || !contactId) return;

  // Scope 1 (claim + note write): CLAIM the signal FIRST (flip it to "noted"
  // only if it isn't already), then, if we won the claim, save the receipted
  // note + its embedding. The claim and the writes share ONE scoped connection
  // — under EE this is a single transaction, so a failed write rolls the claim
  // back too and a retry can re-claim (no claimed-but-noteless signal). It also
  // guards against a double-click: a second in-flight submission finds the
  // signal already noted, claims nothing, and creates no duplicate note/facts/
  // edges (#13). The connection is released at the end of the block — nothing
  // is held across the LLM call below (GOAL 1b / pool-exhaustion #92).
  const prepared = await withUserDb(userId, async () => {
    const signal = await claimSignalForNote(signalId);
    if (!signal) return null;
    const body = signal.sourceUrl
      ? `${signal.headline}\n${signal.detail}\nSource: ${signal.sourceUrl}`
      : `${signal.headline}\n${signal.detail}`;
    const noteId = await addNote(contactId, "signal", body);
    await upsertEmbedding("note", noteId, contactId, body);
    return { noteId, body };
  });

  // LLM phase: extraction wraps its own short-lived DB scopes and releases the
  // connection around the model call — we hold NO tenant connection here.
  if (prepared) {
    await extractAndApplyNote(userId, contactId, prepared.noteId, contactName, prepared.body);
  }

  revalidate(contactId);
}
