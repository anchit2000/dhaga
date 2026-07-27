"use server";

import { revalidatePath } from "next/cache";
import { mutation, MutationError } from "@/lib/actions/mutation";
import type { MutationResult } from "@/lib/actions/mutation";
import {
  addContactsToCompany,
  addTagToContacts,
  forgetContacts,
  removeTagFromContacts,
  setContactsStarred,
} from "@/lib/repo/contacts";
import { parseContactIds } from "./payload";

function revalidateContactSurfaces(): void {
  revalidatePath("/app/people");
  revalidatePath("/app/saved");
  revalidatePath("/app/graph");
}

/** Give many contacts a current position at a company (resolved/created by name). */
export async function addContactsToCompanyAction(
  formData: FormData,
): Promise<MutationResult<{ companyId: string }>> {
  const idsRaw = formData.get("contactIds");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const result = await mutation("addContactsToCompany", async () => {
    const contactIds = parseContactIds(idsRaw);
    if (!companyName) throw new MutationError("Enter a company name.");
    return addContactsToCompany(contactIds, companyName);
  });
  if (result.ok) revalidateContactSurfaces();
  return result;
}

/** Star or unstar many contacts at once. */
export async function bulkStarContactsAction(formData: FormData): Promise<MutationResult<null>> {
  const idsRaw = formData.get("contactIds");
  const starred = String(formData.get("starred") ?? "") === "true";
  const result = await mutation("bulkStarContacts", async () => {
    await setContactsStarred(parseContactIds(idsRaw), starred);
    return null;
  });
  if (result.ok) {
    revalidatePath("/app/people");
    revalidatePath("/app/saved");
  }
  return result;
}

/** Add or remove a single tag across many contacts. */
export async function bulkTagContactsAction(formData: FormData): Promise<MutationResult<null>> {
  const idsRaw = formData.get("contactIds");
  const tag = String(formData.get("tag") ?? "").trim();
  const op = String(formData.get("op") ?? "");
  const result = await mutation("bulkTagContacts", async () => {
    const contactIds = parseContactIds(idsRaw);
    if (!tag) throw new MutationError("Enter a tag.");
    if (op !== "add" && op !== "remove") throw new MutationError("Unknown tag operation.");
    if (op === "add") await addTagToContacts(contactIds, tag);
    else await removeTagFromContacts(contactIds, tag);
    return null;
  });
  if (result.ok) {
    revalidatePath("/app/people");
    revalidatePath("/app/saved");
  }
  return result;
}

/** Forget many contacts at once — full cascade delete for each. */
export async function bulkForgetContactsAction(formData: FormData): Promise<MutationResult<null>> {
  const idsRaw = formData.get("contactIds");
  const result = await mutation("bulkForgetContacts", async () => {
    await forgetContacts(parseContactIds(idsRaw));
    return null;
  });
  if (result.ok) revalidateContactSurfaces();
  return result;
}
