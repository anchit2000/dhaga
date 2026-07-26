"use server";

import { revalidatePath } from "next/cache";
import { hasLLM } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
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
  // Each getDb() below runs inside a withUserDb scope pinned to one tenant-pool
  // connection: a server action gets no React cache() getDb() dedupe, so the
  // getContact + entitlement/budget reads + job insert would otherwise each check
  // out their own connection (max 3) and exhaust it under load.
  if (!(await withUserDb(userId, () => getContact(contactId)))) {
    return { error: "Contact not found." };
  }

  try {
    await withUserDb(userId, async () => {
      await requireFeature(userId, "enrichment");
      await assertAiBudget(userId);
    });
  } catch (error) {
    if (error instanceof AiBudgetError) return { error: error.message };
    if (error instanceof FeatureNotEntitledError) {
      return { error: "Enrichment requires a Pro or Lifetime plan." };
    }
    logActionError("enrich", error);
    return { error: SAVE_RETRY_MESSAGE };
  }

  try {
    await withUserDb(userId, () => createExtractionJob({ contactId, kind: "enrichment" }));
  } catch (error) {
    logActionError("enrich", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  return { noticed: "Searching the public web — findings will appear here shortly." };
}
