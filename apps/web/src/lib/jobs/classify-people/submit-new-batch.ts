import { eq, inArray, isNull, and } from "drizzle-orm";
import {
  PERSON_CLASSIFICATION_SYSTEM,
  buildPersonClassificationPrompt,
  personClassificationSchema,
  type BatchExtractItem,
  type BatchLLMClient,
  type PersonClassification,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, facts } from "@/lib/db/schema";
import type { ScopedRunner } from "@/lib/jobs/tenant-sweep";
import { PERSON_CLASSIFICATION_BATCH_KEY, setPendingBatchId } from "@/lib/repo/settings";
import { PERSON_CLASSIFICATION_RUN_CAP } from "@/utils/constants/person-kind";
import { dueForClassification } from "./due";
import { listClassificationPool } from "./pool";
import type { PersonClassificationSummary } from "./index";

/**
 * Phase 2: take the contacts that are due (see ./due for why the exclusion list
 * is the safety mechanism) AND that a proactive surface could actually nominate
 * (see ./pool for why the difference is most of the cost), and submit their
 * classification prompts as ONE Anthropic batch. `custom_id` is the contact's
 * own id, so no id map is persisted — process-pending-batch.ts reads the
 * contact id straight off each result on a later run.
 *
 * `classifiedSoFar` is whatever phase 1 already applied this run from the
 * previous batch; carried through to the summary rather than recomputed.
 *
 * Note snippets are always empty: ./due excludes every contact that has a live
 * note, so by construction there is none to send. Facts are still loaded —
 * enrichment can attach facts to a contact that was never written about.
 */
export async function submitNewBatch(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
  classifiedSoFar: number,
): Promise<PersonClassificationSummary> {
  const batch = await runScoped(async () => {
    const db = await getDb();
    // NOT every due contact — only the ones a proactive surface could actually
    // nominate (./pool.ts, which also carries the cost arithmetic). `total` is
    // the pool size BEFORE its cap, so `remaining` below stays an honest drain
    // gauge rather than "zero because we took a page".
    const pool = await listClassificationPool();
    if (pool.ids.length === 0) {
      return { rows: [], factsByContact: new Map<string, string[]>(), total: pool.total };
    }
    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        title: contacts.title,
        companyName: companies.name,
        emails: contacts.emails,
        phones: contacts.phones,
      })
      .from(contacts)
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      // dueForClassification stays in the WHERE even though the pool is already
      // an intersection with it: the exclusions are the safety mechanism (see
      // ./due), and they belong where the rows are actually read.
      .where(and(dueForClassification, inArray(contacts.id, pool.ids)))
      .limit(PERSON_CLASSIFICATION_RUN_CAP);
    if (rows.length === 0) {
      return { rows, factsByContact: new Map<string, string[]>(), total: pool.total };
    }
    const factRows = await db
      .select({ contactId: facts.contactId, text: facts.text })
      .from(facts)
      .where(
        and(
          inArray(
            facts.contactId,
            rows.map((row) => row.id),
          ),
          isNull(facts.deletedAt),
        ),
      );
    const factsByContact = new Map<string, string[]>();
    for (const fact of factRows) {
      const existing = factsByContact.get(fact.contactId);
      if (existing) existing.push(fact.text);
      else factsByContact.set(fact.contactId, [fact.text]);
    }
    return { rows, factsByContact, total: pool.total };
  });

  const { rows, factsByContact, total } = batch;
  const items: BatchExtractItem<PersonClassification>[] = rows.map((row) => ({
    id: row.id,
    schema: personClassificationSchema,
    system: PERSON_CLASSIFICATION_SYSTEM,
    // The per-contact context caps (12 facts, 5 notes x 240 chars) are applied
    // INSIDE the builder, so full arrays go in deliberately.
    prompt: buildPersonClassificationPrompt({
      name: row.name,
      title: row.title,
      company: row.companyName,
      emails: row.emails.map((method) => method.value),
      phones: row.phones.map((method) => method.value),
      facts: factsByContact.get(row.id) ?? [],
      noteSnippets: [],
    }),
    tier: "extract",
  }));

  if (items.length > 0) {
    // Submit and persist the batch id FIRST, then stamp — the ordering
    // detect-signals/submit-new-batch.ts documents, for the same reason: if
    // either throws, the stamp loop never runs, so these contacts stay due and
    // are retried next run. Stamping first would mark them judged with nothing
    // ever classified. The batch call is outside runScoped so no DB connection
    // is held across it.
    const batchId = await batchClient.submitExtractBatch(items);
    await runScoped(() => setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, batchId));
    await runScoped(async () => {
      const db = await getDb();
      await db
        .update(contacts)
        .set({ personClassifiedAt: new Date() })
        .where(
          inArray(
            contacts.id,
            rows.map((row) => row.id),
          ),
        );
    });
  }

  return {
    scanned: rows.length,
    classified: classifiedSoFar,
    remaining: Math.max(total - rows.length, 0),
    skipped: null,
  };
}
