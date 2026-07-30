import { getDb, withUserDb } from "@/lib/db/request-scope";
import { emitWebhook } from "@/lib/webhooks";
import { acknowledgeWrites } from "./ack";
import { reconcileContacts } from "./reconcile";
import type {
  SyncAckRequest,
  SyncAckResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "@dhaga/core/src/api/sync";
import type { ReconcileOptions } from "./reconcile";

/**
 * Two-way contact sync, server half. The merge itself is pure and lives in
 * packages/core/src/sync; everything here is the boundary work — identity,
 * persistence, and the company name ↔ FK resolution the merge deliberately
 * knows nothing about.
 *
 * THE constraint on this module: one sync run = ONE scoped DB connection.
 * `withUserDb` opens it, the single `getDb()` below resolves it, and every repo
 * function underneath takes that handle as an argument instead of asking for
 * its own. A `getDb()` per contact (or a Promise.all over the batch) exhausts
 * the max-3 tenant pool and 500s the request — the failure mode this codebase
 * has shipped repeatedly (lib/db/request-scope.ts).
 */
export async function pushContactSync(
  userId: string,
  request: SyncPushRequest,
  options?: ReconcileOptions,
): Promise<SyncPushResponse> {
  const summary = await withUserDb(userId, async () =>
    reconcileContacts(await getDb(), request, options),
  );
  // Emitted after the scope closes so the outbound fetch never holds the
  // connection (the rule importContacts' skipWebhook path follows).
  if (summary.created > 0) {
    await emitWebhook("contacts.imported", {
      count: summary.created,
      format: request.provider,
    });
  }
  return summary;
}

export async function ackContactSync(
  userId: string,
  request: SyncAckRequest,
): Promise<SyncAckResponse> {
  return withUserDb(userId, async () => acknowledgeWrites(await getDb(), request));
}

export { reconcileContacts, type ReconcileOptions } from "./reconcile";
export { acknowledgeWrites } from "./ack";
export { loadLocalContacts, normalizeSyncable, type LocalContact } from "./read";
export { listLinks } from "./links";
// Deliberately NOT wrapped in withUserDb/getDb here: both are read/written from
// a page render and a server action, each of which already owns a scoped
// connection. Opening a second one inside them is the pool-exhaustion bug this
// module's whole shape exists to avoid.
export {
  listPendingSyncConflicts,
  nextLinkConflicts,
  resolveSyncConflict,
  type PendingSyncConflict,
} from "./conflicts";
