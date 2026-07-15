"use server";

import { revalidatePath } from "next/cache";
import { hasLLM } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { AiBudgetError, assertAiBudget } from "@/lib/ai/metering";
import { FeatureNotEntitledError, requireFeature } from "@/lib/entitlements";

export interface EnrichResult {
  noticed?: string;
  error?: string;
}

/**
 * Enqueue a background enrichment job and return at once — the web search plus
 * extraction (20–60s) run in the worker, and the page polls for the findings
 * note and facts as they land. Entitlement and budget are checked up front so
 * a non-entitled or capped user gets an instant, honest error instead of a
 * job that only fails later.
 */
export async function enrichContactAction(
  _previous: EnrichResult,
  formData: FormData,
): Promise<EnrichResult> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return { error: "Missing contact." };
  if (!hasLLM()) return { error: "Configure an LLM provider to enable enrichment." };
  if (!(await getContact(contactId))) return { error: "Contact not found." };

  try {
    await requireFeature(userId, "enrichment");
    await assertAiBudget(userId);
  } catch (error) {
    if (error instanceof AiBudgetError) return { error: error.message };
    if (error instanceof FeatureNotEntitledError) {
      return { error: "Enrichment requires a Pro or Lifetime plan." };
    }
    throw error;
  }

  await createExtractionJob({ contactId, kind: "enrichment" });
  revalidatePath(`/app/people/${contactId}`);
  return { noticed: "Searching the public web — findings will appear here shortly." };
}
