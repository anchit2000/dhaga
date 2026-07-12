import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  SIGNAL_DETECTION_SYSTEM,
  buildSignalDetectionPrompt,
  getSearchClient,
  signalDetectionSchema,
  type BatchExtractItem,
  type BatchLLMClient,
  type SignalDetection,
} from "@dhaga/core";
import type { SignalDetectionSummary } from "@dhaga/core/src/api/jobs";
import { getDb } from "@/lib/db";
import { companies, contacts } from "@/lib/db/schema";
import { setPendingSignalBatchId } from "@/lib/repo/settings";

/** Re-scan cadence per watched contact — nightly cron, weekly-ish per contact. */
const RESCAN_AFTER_DAYS = 6;

/**
 * Phase 2 of the nightly sweep: search every contact due for a rescan and
 * submit one Anthropic batch containing all of their classification
 * prompts. `custom_id` on each request is the contact's own id, so no
 * separate id-mapping needs to be persisted — process-pending-batch.ts
 * reads the contact id straight off each result next time this job runs.
 *
 * `createdSoFar` is whatever process-pending-batch.ts already created this
 * run from the *previous* batch — this function just carries it through to
 * the final summary rather than recomputing it.
 */
export async function submitNewBatch(
  batchClient: BatchLLMClient,
  createdSoFar: number,
): Promise<SignalDetectionSummary> {
  const db = await getDb();
  const rescanCutoff = new Date(Date.now() - RESCAN_AFTER_DAYS * 86_400_000);
  const due = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(
        eq(contacts.watchedForSignals, true),
        or(isNull(contacts.signalsScannedAt), lt(contacts.signalsScannedAt, rescanCutoff)),
      ),
    );

  const search = getSearchClient();
  const items: BatchExtractItem<SignalDetection>[] = [];

  for (const contact of due) {
    await db
      .update(contacts)
      .set({ signalsScannedAt: new Date() })
      .where(eq(contacts.id, contact.id));

    try {
      const results = await search.search(
        [contact.name, contact.companyName].filter(Boolean).join(" "),
        { limit: 5 },
      );
      items.push({
        id: contact.id,
        schema: signalDetectionSchema,
        system: SIGNAL_DETECTION_SYSTEM,
        prompt: buildSignalDetectionPrompt(
          { name: contact.name, title: contact.title, company: contact.companyName },
          results,
        ),
        tier: "extract",
      });
    } catch {
      // One contact's search failing must never abort the rest of the
      // sweep (best-effort, like outbound webhooks) — it's already marked
      // scanned above and will be picked up on the next ~6-day cycle.
    }
  }

  if (items.length > 0) {
    const batchId = await batchClient.submitExtractBatch(items);
    await setPendingSignalBatchId(batchId);
  }

  return { scanned: due.length, created: createdSoFar, skipped: null };
}
