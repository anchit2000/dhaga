"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import {
  dismissSignal,
  getSignal,
  markSignalNoted,
  toggleWatch,
  type ToggleWatchResult,
} from "@/lib/repo/signals";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";

function revalidate(contactId: string): void {
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}

export async function toggleWatchAction(
  _previous: ToggleWatchResult,
  formData: FormData,
): Promise<ToggleWatchResult> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const watch = formData.get("watch") === "true";
  if (!contactId) return { ok: false, error: "Missing contact." };
  const result = await toggleWatch(userId, contactId, watch);
  revalidate(contactId);
  return result;
}

export async function dismissSignalAction(formData: FormData): Promise<void> {
  await requireUserId();
  const signalId = String(formData.get("signalId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!signalId) return;
  await dismissSignal(signalId);
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

  const signal = await getSignal(signalId);
  if (signal) {
    const body = signal.sourceUrl
      ? `${signal.headline}\n${signal.detail}\nSource: ${signal.sourceUrl}`
      : `${signal.headline}\n${signal.detail}`;
    const noteId = await addNote(contactId, "signal", body);
    await upsertEmbedding("note", noteId, contactId, body);
    await extractAndApplyNote(userId, contactId, noteId, contactName, body);
  }
  await markSignalNoted(signalId);
  revalidate(contactId);
}
