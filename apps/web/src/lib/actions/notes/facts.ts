"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { deleteFact, updateFactText, verifyFact } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";

export async function deleteFactAction(formData: FormData): Promise<void> {
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!factId) return;
  const r = await mutation("deleteFact", () => deleteFact(factId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}

export async function updateFactAction(formData: FormData): Promise<void> {
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!factId || !text) return;
  // One scoped connection for the update + local-embed index (mutation() pins it):
  // a server action gets no React cache() getDb() dedupe. A transient throw is
  // caught by the caller's runAction, keeping the inline edit open with its text.
  const r = await mutation("updateFact", async () => {
    await updateFactText(factId, text);
    await upsertEmbedding("fact", factId, contactId, text);
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}

/** Confirm a web-sourced (unverified) fact, clearing its badge. */
export async function verifyFactAction(formData: FormData): Promise<void> {
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!factId) return;
  const r = await mutation("verifyFact", () => verifyFact(factId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}
