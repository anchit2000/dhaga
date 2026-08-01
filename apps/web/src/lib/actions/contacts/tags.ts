"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import type { MutationResult } from "@/lib/actions/mutation";
import { addTagToContacts, listAllTags } from "@/lib/repo/contacts";

/** Suggestions for the contact-page tag combobox — every tag currently in use. */
export async function listTagSuggestionsAction(): Promise<string[]> {
  return listAllTags();
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
