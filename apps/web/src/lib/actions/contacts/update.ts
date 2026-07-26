"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { updateContact } from "@/lib/repo/contacts";
import { field, parseProfilePayload, type ContactFormState } from "./form";

/** Edit an existing contact from the same form (no capture extras ride along). */
export async function updateContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const userId = await requireUserId();
  const contactId = field(formData, "contactId");
  if (!contactId) return { error: "Missing contact." };
  const parsed = parseProfilePayload(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    // Pin one scoped connection for the whole write. updateContact fans out a
    // getDb() per distinct company (findOrCreateCompany), and a server action
    // gets no cache() getDb() dedupe — so a contact with ≥3 distinct employers
    // opened >3 connections and exhausted the max-3 tenant pool, timing out the
    // save. withUserDb makes every getDb() below resolve to the same connection.
    await withUserDb(userId, () => updateContact(contactId, parsed.profile));
  } catch (error) {
    logActionError("updateContact", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
  redirect(`/app/people/${contactId}`);
}
