"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { contactProfileSchema } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { mutation } from "@/lib/actions/mutation";
import { getAuth } from "@/lib/auth/config";
import { socialProviderConfig } from "@/lib/auth/config/social";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { getContactsProvider } from "@/lib/import/providers";
import { CONTACT_IMPORT_PROVIDERS, type ContactImportProviderId } from "@/utils/constants/auth";
import { importContacts, type ImportSummary } from "@/lib/repo/import";
import { emitWebhook } from "@/lib/webhooks";
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
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { error: "That batch didn't validate — re-parse the file." };
  // The client already chunks into ≤200-row batches (one request each). Pin ONE
  // scoped connection for this batch: importContacts fans out a getDb() per row ×
  // distinct company plus the dedup scan and per-row note — enough to exhaust the
  // max-3 tenant pool (a server action gets no cache() getDb() dedupe). mutation()
  // collapses them to one connection and returns a resilient result on failure.
  // skipWebhook keeps the outbound contacts.imported fetch OUT of that scope — we
  // emit it below, after mutation() has released the connection.
  const r = await mutation("importCsvBatch", () =>
    importContacts(parsed.data.candidates, parsed.data.format, { skipWebhook: true }),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  revalidatePath("/app");
  // Best-effort, post-scope: a dead receiver must never fail an import that has
  // already committed (emitWebhook itself swallows + 5s-timeouts; the try/catch
  // is belt-and-braces so a future throwing emit can't break the action).
  if (r.data.created > 0 && r.data.format) {
    try {
      await emitWebhook("contacts.imported", { count: r.data.created, format: r.data.format });
    } catch {
      // Swallowed — the contacts are saved; the webhook is a courtesy.
    }
  }
  return { created: r.data.created, skipped: r.data.skipped };
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
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  return { updated: r.data };
}

export async function confirmClusterCompanyAction(input: unknown): Promise<{ updated?: number; error?: string }> {
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  const { label, contactIds } = parsed.data;
  // "JOGET" reads as a saved-name marker, not a brand — title-case it; short
  // all-caps tokens (IBM, SAP) are likely real acronyms, keep them.
  const companyName =
    label.length > 3 && label === label.toUpperCase()
      ? label[0] + label.slice(1).toLowerCase()
      : label;
  // Pin linkClusterToCompany (+ findOrCreateCompany) + dismissCluster to one connection.
  const r = await mutation("confirmClusterCompany", async () => {
    const updated = await linkClusterToCompany(companyName, contactIds);
    await dismissCluster(label.toLowerCase());
    return updated;
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  return { updated: r.data };
}

export async function dismissClusterAction(input: unknown): Promise<{ error?: string }> {
  const parsed = z.object({ key: z.string().min(1).max(80) }).safeParse(input);
  if (!parsed.success) return { error: "Invalid suggestion." };
  const r = await mutation("dismissCluster", () => dismissCluster(parsed.data.key));
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/import");
  return {};
}
