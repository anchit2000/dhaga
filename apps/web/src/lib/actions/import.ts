"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { contactProfileSchema } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";
import { socialProviderConfig } from "@/lib/auth/config/social";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { getContactsProvider } from "@/lib/import/providers";
import { CONTACT_IMPORT_PROVIDERS, type ContactImportProviderId } from "@/utils/constants/auth";
import { importContacts, type ImportSummary } from "@/lib/repo/import";
import {
  dismissCluster,
  linkClusterToCompany,
  tagCluster,
} from "@/lib/repo/suggestions";
import type { ImportCandidate } from "@/lib/import";

/** Client sends batches (≤200) so big files dodge the action body limit. */
const batchSchema = z.object({
  format: z.enum(["google", "linkedin", "vcard", "microsoft"]),
  candidates: z
    .array(
      z.object({
        contact: contactProfileSchema,
        receipt: z.string().max(2_000),
      }),
    )
    .min(1)
    .max(200),
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

/** Which contacts providers are env-configured, so the UI gates buttons. */
export async function getContactProviderAvailabilityAction(): Promise<ContactImportProviderId[]> {
  await requireUserId();
  const configured = socialProviderConfig();
  return CONTACT_IMPORT_PROVIDERS.filter(({ id }) => id in configured).map(({ id }) => id);
}

type ProviderContactsResult =
  | { ok: true; candidates: ImportCandidate[] }
  | { ok: false; error: string; needsConnect?: boolean };

/**
 * Pull contacts from a connected OAuth provider via better-auth's
 * (auto-refreshing) getAccessToken. Without a linked account carrying the
 * contacts scope we signal `needsConnect` so the client runs linkSocial.
 */
export async function fetchProviderContactsAction(
  provider: ContactImportProviderId,
): Promise<ProviderContactsResult> {
  const userId = await requireUserId();
  const meta = CONTACT_IMPORT_PROVIDERS.find(({ id }) => id === provider);
  if (!meta) return { ok: false, error: "Unsupported provider." };

  try {
    await enforceRateLimit(userId, "import");
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const needsConnect: ProviderContactsResult = {
    ok: false,
    needsConnect: true,
    error: `Connect your ${meta.label} account to import contacts.`,
  };
  const auth = await getAuth();
  let accessToken: string;
  let scopes: string[];
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: provider },
      headers: await headers(),
    });
    accessToken = token.accessToken;
    scopes = token.scopes;
  } catch {
    return needsConnect;
  }
  if (!accessToken || !scopes.includes(meta.scope)) return needsConnect;

  try {
    const candidates = await getContactsProvider(provider).fetchContacts(accessToken);
    return { ok: true, candidates };
  } catch {
    return { ok: false, error: `Couldn't fetch contacts from ${meta.label}. Try again in a moment.` };
  }
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
