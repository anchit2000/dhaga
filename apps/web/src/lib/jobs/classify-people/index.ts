import { getBatchLLMClient, hasBatchLLM, type BatchLLMClient } from "@dhaga/core";
import { forEachTenant, hostedTenantIds, runOnGlobal, type ScopedRunner } from "@/lib/jobs/tenant-sweep";
import { PERSON_CLASSIFICATION_BATCH_KEY, getPendingBatchId } from "@/lib/repo/settings";
import { processPendingBatch } from "./process-pending-batch";
import { submitNewBatch } from "./submit-new-batch";

/**
 * Why the pass produced nothing, if it did. "batch_pending" mirrors
 * detect-signals: the previous run's batch hasn't finished, so this run does no
 * new work and says so rather than returning silent zeros.
 */
export type PersonClassificationSkipReason = "no_llm" | "batch_pending";

/**
 * The drain gauge. `remaining` is how many contacts were STILL due after this
 * run's cap was taken — the number an operator watches fall to zero over a few
 * nights. There is deliberately no backfill script: the idempotent due-query
 * plus PERSON_CLASSIFICATION_RUN_CAP already is the backfill, and a one-shot
 * script would be a second, untested copy of this exclusion list.
 */
export interface PersonClassificationSummary {
  scanned: number;
  classified: number;
  remaining: number;
  skipped: PersonClassificationSkipReason | null;
}

/**
 * Nightly person-vs-service classification: decide whether a contact row is a
 * human the user could message or an address-book service entry ("Ola Support",
 * "Vegetable Vendor"). Only "service" does anything, and only on PROACTIVE
 * surfaces (lib/repo/contacts/surfaceable.ts) — the row stays fully findable.
 *
 * Two-phase over Anthropic's Message Batches API, copied wholesale from
 * lib/jobs/detect-signals for the same reason it is shaped that way there:
 * batches are asynchronous (minutes up to 24h) and this cron fires once a day,
 * so one invocation can never submit a batch and also wait for it. Phase 1
 * applies the PREVIOUS run's batch; phase 2 submits a fresh one for the next.
 * It carries its OWN settings pointer (PERSON_CLASSIFICATION_BATCH_KEY) — see
 * that constant on why sharing one with detect-signals/match-goal would stall
 * them behind each other.
 *
 * Tenant scoping, mode detection and the error-isolated per-tenant loop all come
 * from the shared lib/jobs/tenant-sweep harness: self-host runs ONE global
 * sweep, hosted runs the same sweep once per tenant inside `withUserDb` so RLS
 * scopes every query. One failing tenant is logged and retried next run, never
 * aborting the rest.
 */
export async function runPersonClassification(): Promise<PersonClassificationSummary> {
  if (!hasBatchLLM()) {
    return { scanned: 0, classified: 0, remaining: 0, skipped: "no_llm" };
  }

  const batchClient = getBatchLLMClient();
  const tenantIds = await hostedTenantIds();

  // Self-host / core-only (no tenant gate): one global pass. Deliberately NO
  // per-tenant loop — without a gate withUserDb doesn't scope, so looping users
  // would re-judge the same contacts once per user.
  if (tenantIds === null) {
    return sweepTenant(runOnGlobal, batchClient);
  }

  const summaries = await forEachTenant(tenantIds, "classify-people-sweep", (runScoped) =>
    sweepTenant(runScoped, batchClient),
  );
  let scanned = 0;
  let classified = 0;
  let remaining = 0;
  for (const summary of summaries) {
    scanned += summary.scanned;
    classified += summary.classified;
    remaining += summary.remaining;
  }
  return { scanned, classified, remaining, skipped: null };
}

/**
 * The two-phase pass for a single scope. `runScoped` decides where its DB work
 * lands (global in self-host, one short RLS transaction per unit in hosted); the
 * batch API calls inside the phases run BETWEEN those units, never inside one,
 * so no connection is held across network I/O (PR #92/#96).
 */
async function sweepTenant(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
): Promise<PersonClassificationSummary> {
  const pendingBatchId = await runScoped(() => getPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY));

  let classifiedFromPreviousBatch = 0;
  if (pendingBatchId) {
    const outcome = await processPendingBatch(runScoped, batchClient, pendingBatchId);
    if (!outcome.done) {
      return { scanned: 0, classified: 0, remaining: 0, skipped: "batch_pending" };
    }
    classifiedFromPreviousBatch = outcome.classified;
  }

  return submitNewBatch(runScoped, batchClient, classifiedFromPreviousBatch);
}
