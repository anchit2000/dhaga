"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FACT_TYPES } from "@dhaga/core";
import { mutation, MutationError } from "@/lib/actions/mutation";
import { scheduleCalendarWriteOut } from "@/lib/calendar/write-out";
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
  const parsed = factInputSchema.safeParse({
    contactId: formData.get("contactId"),
    type: formData.get("type"),
    text: formData.get("text"),
  });
  if (!parsed.success) return { error: "Write the fact and pick a type." };
  const { contactId, type, text } = parsed.data;
  // The existence check + write + local-embed index share ONE scoped connection
  // via mutation() — a server action gets no React cache() getDb() dedupe, so
  // each getDb() would otherwise check out its own tenant-pool connection (max 3).
  const r = await mutation("addFact", async () => {
    if (!(await getContact(contactId))) throw new MutationError("Contact not found.");
    const factId = await addFact(contactId, type, text);
    await upsertEmbedding("fact", factId, contactId, text);
  });
  if (!r.ok) return { error: r.error };
  revalidatePath(`/app/people/${contactId}`);
  return { notice: "Fact added." };
}

/** Add an open follow-up the user typed — no note, no LLM, no AI budget. */
export async function createFollowUpAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const contactId = String(formData.get("contactId") ?? "");
  const action = String(formData.get("action") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const parsedDue = dueRaw ? new Date(dueRaw) : null;
  const dueDate = parsedDue && !Number.isNaN(parsedDue.getTime()) ? parsedDue : null;
  if (!contactId) return { error: "Missing contact." };
  if (!action) return { error: "Describe the follow-up first." };
  // mutation() pins the getContact read + insert to one tenant-pool connection
  // (server actions get no React cache() getDb() dedupe — see request-scope).
  const r = await mutation("createFollowUp", async (userId) => {
    if (!(await getContact(contactId))) throw new MutationError("Contact not found.");
    return { userId, followUpId: await addFollowUp(contactId, action, dueDate) };
  });
  if (!r.ok) return { error: r.error };
  // Mirror it onto any upgraded, write-enabled calendar — after the response,
  // so a slow provider never delays the save (lib/calendar/write-out.ts).
  scheduleCalendarWriteOut(r.data.userId, r.data.followUpId);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  return { notice: "Follow-up added." };
}
