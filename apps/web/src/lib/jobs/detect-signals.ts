import { randomUUID } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  SIGNAL_DETECTION_SYSTEM,
  buildSignalDetectionPrompt,
  getLLMClient,
  getSearchClient,
  hasLLM,
  hasSearch,
  signalDetectionSchema,
} from "@dhaga/core";
import type { SignalDetectionSummary } from "@dhaga/core/src/api/jobs";
import { getDb } from "@/lib/db";
import { companies, contacts, signals } from "@/lib/db/schema";
import { recordAiAction } from "@/lib/ai/metering";

/** Re-scan cadence per watched contact — nightly cron, weekly-ish per contact. */
const RESCAN_AFTER_DAYS = 6;

/**
 * Nightly signal detection (BRD §5.2 v1.2, §6.7): web-search each watched
 * contact, classify the results with Haiku, write a `signals` row on a
 * genuine hit. Job-change detection and the news watchlist are the same
 * sweep — `kind` on the row is what distinguishes them.
 *
 * Runs against the default (non-tenant-scoped) connection, same as the
 * Telegram webhook — correct for self-host today. Full per-tenant RLS
 * scoping for Dhaga Cloud's multi-tenant mode is a follow-up (tracked in
 * docs/checklist.md alongside the rest of the packages/ee boundary).
 */
export async function runSignalDetection(): Promise<SignalDetectionSummary> {
  if (!hasSearch()) return { scanned: 0, created: 0, skipped: "no_search" };
  if (!hasLLM()) return { scanned: 0, created: 0, skipped: "no_llm" };

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
  const llm = getLLMClient();
  let created = 0;

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
      const classification = await llm.extract({
        schema: signalDetectionSchema,
        system: SIGNAL_DETECTION_SYSTEM,
        prompt: buildSignalDetectionPrompt(
          { name: contact.name, title: contact.title, company: contact.companyName },
          results,
        ),
        tier: "extract",
      });
      await recordAiAction("signal_detection", classification.model, classification.usage);

      const { hasSignal, kind, headline, detail, sourceUrl } = classification.data;
      if (hasSignal && kind) {
        await db.insert(signals).values({
          id: randomUUID(),
          contactId: contact.id,
          kind,
          headline,
          detail,
          sourceUrl,
          status: "new",
        });
        created += 1;
      }
    } catch {
      // One contact's search/classification failing must never abort the
      // rest of the sweep (best-effort, like outbound webhooks).
    }
  }

  return { scanned: due.length, created, skipped: null };
}
