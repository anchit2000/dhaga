"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { mutation } from "@/lib/actions/mutation";
import type { MutationResult } from "@/lib/actions/mutation";
import { withUserDb } from "@/lib/db/request-scope";
import { addTagToContacts, listAllTags } from "@/lib/repo/contacts";

/** Suggestions for the contact-page tag combobox — every tag currently in use.
 *  A read — one scoped connection, so it never fans out getDb() across the
 *  tenant pool (same shape as listRelationshipTypesAction). */
export async function listTagSuggestionsAction(): Promise<string[]> {
  const userId = await requireUserId();
  return withUserDb(userId, () => listAllTags());
}

/** Assign one tag to a single contact — a thin single-id wrapper around the
 *  existing bulk repo call (`addTagToContacts`), not a duplicate of it. */
export async function addTagToContactAction(
  contactId: string,
  tag: string,
): Promise<MutationResult<null>> {
  const result = await mutation("addTagToContact", async () => {
    await addTagToContacts([contactId], tag);
    return null;
  });
  if (result.ok) revalidatePath(`/app/people/${contactId}`);
  return result;
}
