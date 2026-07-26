"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FACT_TYPES } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
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
  const userId = await requireUserId();
  const parsed = factInputSchema.safeParse({
    contactId: formData.get("contactId"),
    type: formData.get("type"),
    text: formData.get("text"),
  });
  if (!parsed.success) return { error: "Write the fact and pick a type." };
  const { contactId, type, text } = parsed.data;
  if (!(await withUserDb(userId, () => getContact(contactId)))) {
    return { error: "Contact not found." };
  }
  // One scoped connection for the write + local-embed index: a server action gets
  // no React cache() getDb() dedupe, so each getDb() would otherwise check out its
  // own tenant-pool connection (max 3) and exhaust it under load.
  try {
    await withUserDb(userId, async () => {
      const factId = await addFact(contactId, type, text);
      await upsertEmbedding("fact", factId, contactId, text);
    });
  } catch (error) {
    logActionError("addFact", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  return { notice: "Fact added." };
}

/** Add an open follow-up the user typed — no note, no LLM, no AI budget. */
export async function createFollowUpAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const action = String(formData.get("action") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const parsedDue = dueRaw ? new Date(dueRaw) : null;
  const dueDate = parsedDue && !Number.isNaN(parsedDue.getTime()) ? parsedDue : null;
  if (!contactId) return { error: "Missing contact." };
  if (!action) return { error: "Describe the follow-up first." };
  if (!(await withUserDb(userId, () => getContact(contactId)))) {
    return { error: "Contact not found." };
  }
  // withUserDb pins the getContact read + insert to one tenant-pool connection
  // (server actions get no React cache() getDb() dedupe — see request-scope).
  try {
    await withUserDb(userId, () => addFollowUp(contactId, action, dueDate));
  } catch (error) {
    logActionError("createFollowUp", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  return { notice: "Follow-up added." };
}
