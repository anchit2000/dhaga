"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mutation } from "@/lib/actions/mutation";
import {
  dismissCluster,
  linkClusterToCompany,
  linkClusterToLocation,
  tagCluster,
} from "@/lib/repo/suggestions";

const clusterSchema = z.object({
  label: z.string().trim().min(1).max(80),
  contactIds: z.array(z.string().min(1)).min(1).max(500),
});

/** "JOGET" reads as a saved-name marker, not a proper noun — title-case it;
 *  short all-caps tokens (IBM, SAP) are likely real acronyms, keep them. */
function deshoutIfAllCaps(label: string): string {
  return label.length > 3 && label === label.toUpperCase()
    ? label[0] + label.slice(1).toLowerCase()
    : label;
}

function revalidateClusterPaths(): void {
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  revalidatePath("/app/groups");
}

export async function confirmClusterTagAction(input: unknown): Promise<{ updated?: number; error?: string }> {
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  // Pin tagCluster + dismissCluster (each opens a getDb()) to one connection.
  const r = await mutation("confirmClusterTag", async () => {
    // Tags are stored lowercase (extraction convention).
    const updated = await tagCluster(parsed.data.label.toLowerCase(), parsed.data.contactIds);
    await dismissCluster(parsed.data.label.toLowerCase());
    return updated;
  });
  if (!r.ok) return { error: r.error };
  revalidateClusterPaths();
  return { updated: r.data };
}

export async function confirmClusterCompanyAction(input: unknown): Promise<{ updated?: number; error?: string }> {
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  const { label, contactIds } = parsed.data;
  const companyName = deshoutIfAllCaps(label);
  // Pin linkClusterToCompany (+ findOrCreateCompany) + dismissCluster to one connection.
  const r = await mutation("confirmClusterCompany", async () => {
    const updated = await linkClusterToCompany(companyName, contactIds);
    await dismissCluster(label.toLowerCase());
    return updated;
  });
  if (!r.ok) return { error: r.error };
  revalidateClusterPaths();
  return { updated: r.data };
}

export async function confirmClusterLocationAction(input: unknown): Promise<{ updated?: number; error?: string }> {
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  const { label, contactIds } = parsed.data;
  const location = deshoutIfAllCaps(label);
  // Pin linkClusterToLocation + dismissCluster to one connection.
  const r = await mutation("confirmClusterLocation", async () => {
    const updated = await linkClusterToLocation(location, contactIds);
    await dismissCluster(label.toLowerCase());
    return updated;
  });
  if (!r.ok) return { error: r.error };
  revalidateClusterPaths();
  return { updated: r.data };
}

export async function dismissClusterAction(input: unknown): Promise<{ error?: string }> {
  const parsed = z.object({ key: z.string().min(1).max(80) }).safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  const r = await mutation("dismissCluster", () => dismissCluster(parsed.data.key));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/import");
  revalidatePath("/app/groups");
  return {};
}
