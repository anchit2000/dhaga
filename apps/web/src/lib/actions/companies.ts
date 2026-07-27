"use server";

import { revalidatePath } from "next/cache";
import { companyMergeResolutionSchema } from "@dhaga/core";
import {
  createCompany,
  deleteCompany,
  getCompaniesForMerge,
  mergeCompanies,
  renameCompany,
  type CompanyMergeRecord,
} from "@/lib/repo/companies";
import { PreconditionError } from "@/lib/repo/errors";
import { MutationError, mutation, type MutationResult } from "@/lib/actions/mutation";

/** Trimmed string, or null when blank — the shape create/rename expect for the
 *  optional domain/sector fields. */
function optionalText(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value || null;
}

/**
 * Run repo work inside mutation(), turning a repo PreconditionError (a
 * hand-written, user-safe message) into a surfaced MutationError; any other
 * throw propagates so mutation() logs it and returns the generic transient copy
 * instead of a raw SQL/timeout string.
 */
async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PreconditionError) throw new MutationError(error.message);
    throw error;
  }
}

export async function createCompanyAction(
  formData: FormData,
): Promise<MutationResult<{ id: string }>> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Give the company a name." };
  const domain = optionalText(formData.get("domain"));
  const sector = optionalText(formData.get("sector"));
  const r = await mutation("createCompany", () => guard(() => createCompany({ name, domain, sector })));
  if (r.ok) revalidatePath("/app/companies");
  return r;
}

export async function renameCompanyAction(formData: FormData): Promise<MutationResult<null>> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing company." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Give the company a name." };
  const domain = optionalText(formData.get("domain"));
  const sector = optionalText(formData.get("sector"));
  const r = await mutation("renameCompany", () =>
    guard(async () => {
      await renameCompany(id, { name, domain, sector });
      return null;
    }),
  );
  if (r.ok) {
    // The company name is denormalised onto People rows and the graph node.
    revalidatePath("/app/companies");
    revalidatePath(`/app/companies/${id}`);
    revalidatePath("/app/people");
    revalidatePath("/app/graph");
  }
  return r;
}

export async function deleteCompanyAction(formData: FormData): Promise<MutationResult<null>> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing company." };
  const r = await mutation("deleteCompany", () =>
    guard(async () => {
      await deleteCompany(id);
      return null;
    }),
  );
  if (r.ok) {
    // Detaches people (their company drops off People rows) and removes the node.
    revalidatePath("/app/companies");
    revalidatePath("/app/people");
    revalidatePath("/app/graph");
  }
  return r;
}

export async function mergeCompaniesAction(
  formData: FormData,
): Promise<MutationResult<{ targetId: string }>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("resolution") ?? ""));
  } catch {
    return { ok: false, error: "Invalid merge selection." };
  }
  const result = companyMergeResolutionSchema.safeParse(parsed);
  if (!result.success) return { ok: false, error: "Invalid merge selection." };
  const r = await mutation("mergeCompanies", () => guard(() => mergeCompanies(result.data)));
  if (r.ok) {
    revalidatePath("/app/companies");
    revalidatePath("/app/people");
    revalidatePath("/app/graph");
  }
  return r;
}

export async function loadCompaniesForMergeAction(
  formData: FormData,
): Promise<MutationResult<CompanyMergeRecord[]>> {
  let ids: unknown;
  try {
    ids = JSON.parse(String(formData.get("ids") ?? ""));
  } catch {
    return { ok: false, error: "Invalid selection." };
  }
  if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === "string")) {
    return { ok: false, error: "Invalid selection." };
  }
  return mutation("loadCompaniesForMerge", () => getCompaniesForMerge(ids));
}
