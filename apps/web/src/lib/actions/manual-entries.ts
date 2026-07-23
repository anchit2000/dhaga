"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FACT_TYPES } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { addFact, addFollowUp } from "@/lib/repo/manual-entries";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import type { NoteFormState } from "./notes";

const factInputSchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(FACT_TYPES),
  text: z.string().trim().min(1),
});

/**
 * Add a fact the user typed — no note, no extraction, no LLM, no AI budget.
 * The fact is written with a NULL source_note_id (repo/manual-entries), then
 * indexed with the LOCAL embedder — a free on-device primitive (never a metered
 * cloud call), the same call updateFactAction already makes — so manual facts
 * stay semantically searchable without spending an AI action.
 */
export async function addFactAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  await requireUserId();
  const parsed = factInputSchema.safeParse({
    contactId: formData.get("contactId"),
    type: formData.get("type"),
    text: formData.get("text"),
  });
  if (!parsed.success) return { error: "Write the fact and pick a type." };
  const { contactId, type, text } = parsed.data;
  if (!(await getContact(contactId))) return { error: "Contact not found." };
  const factId = await addFact(contactId, type, text);
  await upsertEmbedding("fact", factId, contactId, text);
  revalidatePath(`/app/people/${contactId}`);
  return { notice: "Fact added." };
}

/** Add an open follow-up the user typed — no note, no LLM, no AI budget. */
export async function createFollowUpAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const action = String(formData.get("action") ?? "").trim();
  const dueHint = String(formData.get("dueHint") ?? "").trim() || null;
  if (!contactId) return { error: "Missing contact." };
  if (!action) return { error: "Describe the follow-up first." };
  if (!(await getContact(contactId))) return { error: "Contact not found." };
  await addFollowUp(contactId, action, dueHint);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  return { notice: "Follow-up added." };
}
