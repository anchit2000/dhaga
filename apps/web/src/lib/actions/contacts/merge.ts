"use server";

import { revalidatePath } from "next/cache";
import { contactMergeResolutionSchema } from "@dhaga/core";
import { mutation, MutationError } from "@/lib/actions/mutation";
import type { MutationResult } from "@/lib/actions/mutation";
import { PreconditionError } from "@/lib/repo/errors";
import { getContactsForMerge, mergeContacts } from "@/lib/repo/contacts";
import type { ContactMergeRecord } from "@/lib/repo/contacts";
import { parseContactIds } from "./payload";

/**
 * Fold the selected contacts into one, per the user's resolution from the merge
 * dialog. Returns the surviving id so the client can route to it. Not a
 * redirect: this fires from a table and the client refreshes.
 */
export async function mergeContactsAction(
  formData: FormData,
): Promise<MutationResult<{ targetId: string }>> {
  const raw = formData.get("resolution");
  const result = await mutation("mergeContacts", async () => {
    if (typeof raw !== "string") throw new MutationError("Missing merge details.");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new MutationError("Could not read the merge details — try again.");
    }
    const parsed = contactMergeResolutionSchema.safeParse(json);
    if (!parsed.success) throw new MutationError("The merge details were incomplete.");
    try {
      return await mergeContacts(parsed.data);
    } catch (error) {
      // Repo raises PreconditionError (user-safe copy); surface it verbatim.
      if (error instanceof PreconditionError) throw new MutationError(error.message);
      throw error;
    }
  });
  if (result.ok) {
    revalidatePath("/app/people");
    revalidatePath("/app/saved");
    revalidatePath("/app/graph");
  }
  return result;
}

/**
 * Load the selected contacts so the merge dialog can render the primary picker
 * and compute conflicts client-side. Read-only — wrapped in mutation() only for
 * auth and one scoped connection.
 */
export async function loadContactsForMergeAction(
  formData: FormData,
): Promise<MutationResult<ContactMergeRecord[]>> {
  const raw = formData.get("ids");
  return mutation("loadContactsForMerge", async () => getContactsForMerge(parseContactIds(raw)));
}
