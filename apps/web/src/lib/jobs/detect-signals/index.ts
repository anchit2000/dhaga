import { getBatchLLMClient, hasBatchLLM, hasSearch, type BatchLLMClient } from "@dhaga/core";
import type { SignalDetectionSummary } from "@dhaga/core/src/api/jobs";
import { getDb as getGlobalDb } from "@/lib/db";
import { withUserDb } from "@/lib/db/request-scope";
import { authUser } from "@/lib/db/schema";
import { getTenantGate } from "@/lib/hosted/gate";
import { logActionError } from "@/lib/actions/resilience";
import { getPendingSignalBatchId } from "@/lib/repo/settings";
import { processPendingBatch } from "./process-pending-batch";
import { submitNewBatch } from "./submit-new-batch";

/**
 * Runs one DB-only unit of work in the caller's tenant scope. In hosted mode it
 * is `withUserDb(userId, …)`, so each unit is a single short RLS-scoped
 * transaction; in self-host it is a passthrough onto the plain global
 * connection. Callers MUST wrap only DB work in it and keep the sweep's
 * search/LLM calls BETWEEN units, never inside one — so no connection is ever
 * held across network I/O (connection hygiene, PR #92/#96).
 */
export type ScopedRunner = <T>(work: () => Promise<T>) => Promise<T>;

/** Self-host runner: no tenant gate, so DB work runs on the plain global
 *  connection with no transaction held across the sweep's search calls. */
const runOnGlobal: ScopedRunner = (work) => work();

/** Not a real tenant — only used to ask the gate whether it scopes at all
 *  (a non-null connection ⇒ hosted RLS). scopedDb sets no tenant GUC until
 *  run()/begin(), which the mode probe never calls, so this id never reaches a
 *  query. */
const TENANT_MODE_PROBE_ID = "__signal-sweep-mode-probe__";

/**
 * Nightly signal detection (BRD §5.2 v1.2, §6.7): web-search each watched
 * contact, classify the results with Haiku, write a `signals` row on a
 * genuine hit. Job-change detection and the news watchlist are the same
 * sweep — `kind` on the row is what distinguishes them.
 *
 * Runs through Anthropic's Message Batches API (CLAUDE.md: "Nightly/
 * latency-insensitive jobs: Batch API") instead of one Haiku call per
 * contact — half the token cost, and this job has no latency requirement
 * to trade away. Batches are asynchronous (minutes up to 24h) and this cron
 * fires once a day (Vercel Hobby's cron limit is once-daily), so a single
 * invocation can never submit a batch and also wait for it — that would
 * mean blocking up to 24h inside a ~300s function. Instead this is a
 * two-phase job spread across runs:
 *   - phase 1 (./process-pending-batch): apply the results of whatever
 *     batch was submitted on the *previous* run, if it has finished.
 *   - phase 2 (./submit-new-batch): search every contact newly due for a
 *     rescan and submit their classification prompts as one fresh batch
 *     for the *next* run to pick up.
 * Net effect: a contact's signal lands roughly a day after it becomes due,
 * instead of immediately — an honest tradeoff for a job that was already
 * nightly and latency-insensitive by design, in exchange for never holding
 * a cron invocation open waiting on an async batch.
 *
 * Tenant scoping: self-host (no tenant gate) runs ONE global sweep across
 * both phases — RLS is off, so a single unscoped pass is both correct and all
 * there is to do. Dhaga Cloud (hosted, RLS on) runs the same two-phase sweep
 * once per tenant inside `withUserDb`, because an unscoped connection sets no
 * `app.current_user_id` and RLS would then filter every tenant table to zero
 * rows. Tenants are enumerated from the core (non-RLS) auth `user` table over
 * the plain global connection — the tenant tables themselves are only ever
 * touched inside a per-user scope, never via an RLS bypass on the sweep.
 */
export async function runSignalDetection(): Promise<SignalDetectionSummary> {
  if (!hasSearch()) return { scanned: 0, created: 0, skipped: "no_search" };
  if (!hasBatchLLM()) return { scanned: 0, created: 0, skipped: "no_llm" };

  const batchClient = getBatchLLMClient();
  const tenantIds = await hostedTenantIds();

  // Self-host / core-only (no tenant gate): one global sweep across both
  // phases, exactly as before — deliberately NO per-tenant loop. Without a gate
  // withUserDb doesn't scope, so looping users would rescan every contact once
  // per user and duplicate signals.
  if (tenantIds === null) {
    return sweepTenant(runOnGlobal, batchClient);
  }

  // Hosted (RLS on): sweep each tenant inside its own scope so every query is
  // filtered to that user. One tenant failing must never abort the rest
  // (best-effort, mirroring how the sweep already tolerates per-contact search
  // failures).
  let scanned = 0;
  let created = 0;
  for (const userId of tenantIds) {
    try {
      const summary = await sweepTenant((work) => withUserDb(userId, work), batchClient);
      scanned += summary.scanned;
      created += summary.created;
    } catch (error) {
      // Isolate the tenant: one user's sweep failing must not abort the rest.
      // logActionError records only { code, name, transient } — never the
      // error body, which for a DB/batch error could echo contact-derived text
      // (privacy rule). The tenant is simply retried on the next nightly run.
      logActionError("detect-signals-sweep", error);
    }
  }
  return { scanned, created, skipped: null };
}

/**
 * The two-phase sweep for a single scope. `runScoped` decides where its DB
 * reads/writes land (global in self-host, one RLS transaction per unit in
 * hosted); the search/LLM calls inside the phases run between those units,
 * never inside one, so no DB connection is held across the network. Each tenant
 * carries its own pending-batch pointer (a per-user `settings` row under RLS),
 * so `getPendingSignalBatchId` is read inside the scope too.
 */
async function sweepTenant(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
): Promise<SignalDetectionSummary> {
  const pendingBatchId = await runScoped(() => getPendingSignalBatchId());

  let createdFromPreviousBatch = 0;
  if (pendingBatchId) {
    const outcome = await processPendingBatch(runScoped, batchClient, pendingBatchId);
    if (!outcome.done) {
      return { scanned: 0, created: 0, skipped: "batch_pending" };
    }
    createdFromPreviousBatch = outcome.created;
  }

  return submitNewBatch(runScoped, batchClient, createdFromPreviousBatch);
}

/**
 * All tenant ids to sweep in hosted mode, or `null` when this instance is
 * self-host / core-only (a single global sweep is correct — the gate scopes
 * nothing). Mode is read straight off the tenant gate: `scopedDb()` returns
 * null in core-only mode and a real scoped connection under EE's RLS. The user
 * list itself comes from the core (non-RLS) auth `user` table over the plain
 * global connection, which is exactly why it can see every tenant without an
 * RLS bypass on the tenant tables.
 */
async function hostedTenantIds(): Promise<string[] | null> {
  const probe = await (await getTenantGate()).scopedDb(TENANT_MODE_PROBE_ID);
  if (!probe) return null;
  // The probe only answers "does the gate scope?" — it opened no transaction
  // and set no tenant GUC, so hand its connection straight back to the pool.
  await probe.release();

  const db = await getGlobalDb();
  const rows = await db.select({ id: authUser.id }).from(authUser);
  return rows.map((row) => row.id);
}
