"use server";

import { revalidatePath } from "next/cache";
import { MutationError, mutation, type MutationResult } from "@/lib/actions/mutation";
import { PreconditionError } from "@/lib/repo/errors";
import {
  addAlias,
  listAliases,
  removeAlias,
  updateAlias,
} from "@/lib/repo/company-aliases";
import type { CompanyAliasRow } from "@/lib/db/schema";

/**
 * Server actions the company-alias UIs bind to. Reads/writes run through
 * mutation() (auth + one scoped tenant connection); a repo PreconditionError
 * (hand-written, user-safe) is surfaced as a MutationError, any other throw
 * takes mutation()'s generic transient path.
 */

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PreconditionError) throw new MutationError(error.message);
    throw error;
  }
}

function revalidateAliases(): void {
  revalidatePath("/app/companies");
  revalidatePath("/app/companies/aliases");
}

/** Read every alias of one company — the per-company editor loads this. */
export async function listCompanyAliasesAction(
  companyId: string,
): Promise<MutationResult<CompanyAliasRow[]>> {
  if (!companyId) return { ok: false, error: "Missing company." };
  return mutation("listCompanyAliases", () => listAliases(companyId));
}

export async function addCompanyAliasAction(formData: FormData): Promise<MutationResult<null>> {
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { ok: false, error: "Missing company." };
  const alias = String(formData.get("alias") ?? "").trim();
  if (!alias) return { ok: false, error: "Give the alias a name." };
  const r = await mutation("addCompanyAlias", () =>
    guard(async () => {
      await addAlias(companyId, alias);
      return null;
    }),
  );
  if (r.ok) revalidateAliases();
  return r;
}

export async function updateCompanyAliasAction(formData: FormData): Promise<MutationResult<null>> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing alias." };
  const alias = String(formData.get("alias") ?? "").trim();
  if (!alias) return { ok: false, error: "Give the alias a name." };
  const r = await mutation("updateCompanyAlias", () =>
    guard(async () => {
      await updateAlias(id, alias);
      return null;
    }),
  );
  if (r.ok) revalidateAliases();
  return r;
}

export async function removeCompanyAliasAction(formData: FormData): Promise<MutationResult<null>> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing alias." };
  const r = await mutation("removeCompanyAlias", () =>
    guard(async () => {
      await removeAlias(id);
      return null;
    }),
  );
  if (r.ok) revalidateAliases();
  return r;
}
