"use server";

import { revalidatePath } from "next/cache";
import { mutation, MutationError } from "@/lib/actions/mutation";
import type { MutationResult } from "@/lib/actions/mutation";
import {
  addContactsToCompany,
  addTagToContacts,
  forgetContacts,
  removeTagFromContacts,
  setContactsAffiliation,
  setContactsCompany,
  setContactsLocation,
  setContactsStarred,
} from "@/lib/repo/contacts";
import { PREDICATE_SLUG_PATTERN } from "@/utils/constants/graph";
import { parseContactIds } from "./payload";

function revalidateContactSurfaces(): void {
  revalidatePath("/app/people");
  revalidatePath("/app/saved");
  revalidatePath("/app/graph");
  revalidatePath("/app/groups");
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

/** Relabel the company affiliation (studied_at, worked_at, custom, …) across
 *  many contacts — either their current company or one chosen company. */
export async function bulkSetAffiliationAction(formData: FormData): Promise<MutationResult<null>> {
  const idsRaw = formData.get("contactIds");
  const relation = String(formData.get("relation") ?? "").trim();
  const targetMode = String(formData.get("targetMode") ?? "");
  const companyId = String(formData.get("companyId") ?? "").trim();
  const result = await mutation("bulkSetAffiliation", async () => {
    const contactIds = parseContactIds(idsRaw);
    // Built-in org predicates are all snake_case slugs and custom predicates are
    // allowed as long as they match PREDICATE_SLUG_PATTERN — so the pattern is
    // the allowed set (same validation as createRelationshipTypeAction).
    if (!relation) throw new MutationError("Choose a relationship.");
    if (!PREDICATE_SLUG_PATTERN.test(relation)) {
      throw new MutationError("Relationship must be a snake_case slug (e.g. studied_at).");
    }
    let target: { mode: "current" } | { mode: "company"; companyId: string };
    if (targetMode === "company") {
      if (!companyId) throw new MutationError("Choose a company.");
      target = { mode: "company", companyId };
    } else {
      target = { mode: "current" };
    }
    await setContactsAffiliation(contactIds, target, relation);
    return null;
  });
  if (result.ok) revalidateContactSurfaces();
  return result;
}

/** Force-set the company for many contacts at once, overwriting whatever
 *  each already had — the manual "Create group" counterpart to
 *  addContactsToCompanyAction's positions-based "give a role" semantics. */
export async function setContactsCompanyAction(
  formData: FormData,
): Promise<MutationResult<{ updated: number }>> {
  const idsRaw = formData.get("contactIds");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const result = await mutation("setContactsCompany", async () => {
    const contactIds = parseContactIds(idsRaw);
    if (!companyName) throw new MutationError("Enter a company name.");
    return { updated: await setContactsCompany(contactIds, companyName) };
  });
  if (result.ok) revalidateContactSurfaces();
  return result;
}

/** Force-set the location for many contacts at once, overwriting whatever each already had. */
export async function setContactsLocationAction(
  formData: FormData,
): Promise<MutationResult<{ updated: number }>> {
  const idsRaw = formData.get("contactIds");
  const location = String(formData.get("location") ?? "").trim();
  const result = await mutation("setContactsLocation", async () => {
    const contactIds = parseContactIds(idsRaw);
    if (!location) throw new MutationError("Enter a location.");
    return { updated: await setContactsLocation(contactIds, location) };
  });
  if (result.ok) revalidateContactSurfaces();
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
