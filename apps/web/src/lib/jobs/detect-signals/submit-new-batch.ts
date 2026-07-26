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
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { setPendingSignalBatchId } from "@/lib/repo/settings";
import type { ScopedRunner } from "./index";

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
 *
 * `runScoped` runs each DB unit in the caller's scope (global in self-host, one
 * RLS transaction per unit in hosted). The per-contact Firecrawl search runs
 * BETWEEN those units — the read of due contacts and the writes that follow —
 * never inside one, so no DB connection is held across the network I/O.
 */
export async function submitNewBatch(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
  createdSoFar: number,
): Promise<SignalDetectionSummary> {
  const rescanCutoff = new Date(Date.now() - RESCAN_AFTER_DAYS * 86_400_000);
  const due = await runScoped(async () => {
    const db = await getDb();
    return db
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
  });

  const search = getSearchClient();
  const items: BatchExtractItem<SignalDetection>[] = [];

  for (const contact of due) {
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
      // sweep (best-effort, like outbound webhooks) — it's still marked
      // scanned below and will be picked up on the next ~6-day cycle.
    }
  }

  if (items.length > 0) {
    // Submit and persist the batch id FIRST. If either throws, the stamp
    // loop below never runs, so these contacts stay due and are retried on
    // the next cron run — stamping before submit (as this used to) skipped
    // them for ~RESCAN_AFTER_DAYS with nothing ever classified. submitExtractBatch
    // is the batch API call, deliberately outside runScoped so no DB
    // connection is held across it.
    const batchId = await batchClient.submitExtractBatch(items);
    await runScoped(() => setPendingSignalBatchId(batchId));
  }

  // Mark every due contact scanned only after the batch is safely in flight.
  await runScoped(async () => {
    const db = await getDb();
    for (const contact of due) {
      await db
        .update(contacts)
        .set({ signalsScannedAt: new Date() })
        .where(eq(contacts.id, contact.id));
    }
  });

  return { scanned: due.length, created: createdSoFar, skipped: null };
}
