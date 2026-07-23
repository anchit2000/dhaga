"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contactProfileSchema } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { importContacts, type ImportSummary } from "@/lib/repo/import";
import {
  dismissCluster,
  linkClusterToCompany,
  tagCluster,
} from "@/lib/repo/suggestions";

/** Client sends batches (≤100) so big files dodge the action body limit. */
const batchSchema = z.object({
  format: z.enum(["google", "linkedin", "vcard"]),
  candidates: z
    .array(
      z.object({
        contact: contactProfileSchema,
        receipt: z.string().max(2_000),
      }),
    )
    .min(1)
    .max(100),
});

const clusterSchema = z.object({
  label: z.string().trim().min(1).max(80),
  contactIds: z.array(z.string().min(1)).min(1).max(500),
});

type ImportBatchResult = ImportSummary | { error: string };

export async function importCsvBatchAction(input: unknown): Promise<ImportBatchResult> {
  await requireUserId();
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { error: "That batch didn't validate — re-parse the file." };
  const summary = await importContacts(parsed.data.candidates, parsed.data.format);
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  revalidatePath("/app");
  return summary;
}

export async function confirmClusterTagAction(input: unknown): Promise<{ updated?: number; error?: string }> {
  await requireUserId();
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  // Tags are stored lowercase (extraction convention).
  const updated = await tagCluster(parsed.data.label.toLowerCase(), parsed.data.contactIds);
  await dismissCluster(parsed.data.label.toLowerCase());
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  return { updated };
}

export async function confirmClusterCompanyAction(input: unknown): Promise<{ updated?: number; error?: string }> {
  await requireUserId();
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  const { label, contactIds } = parsed.data;
  // "JOGET" reads as a saved-name marker, not a brand — title-case it; short
  // all-caps tokens (IBM, SAP) are likely real acronyms, keep them.
  const companyName =
    label.length > 3 && label === label.toUpperCase()
      ? label[0] + label.slice(1).toLowerCase()
      : label;
  const updated = await linkClusterToCompany(companyName, contactIds);
  await dismissCluster(label.toLowerCase());
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  return { updated };
}

export async function dismissClusterAction(input: unknown): Promise<{ error?: string }> {
  await requireUserId();
  const parsed = z.object({ key: z.string().min(1).max(80) }).safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  await dismissCluster(parsed.data.key);
  revalidatePath("/app/import");
  return {};
}
