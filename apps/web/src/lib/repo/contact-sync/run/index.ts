import { getDb, withUserDb } from "@/lib/db/request-scope";
import { acknowledgeWrites } from "@/lib/repo/sync/ack";
import { reconcileContacts } from "@/lib/repo/sync/reconcile";
import {
  providerFor,
  recordSyncRun,
  syncableConnectionRows,
  usableAccessToken,
} from "../connections";
import { authorisesSweep, enumerateRemote, nextCursor } from "./enumerate";
import { emptyResult, type ContactSyncRunResult } from "./types";
import { applyWrites, toObserved } from "./writes";
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { ContactConnectionRow } from "@/lib/db/schema";

export type { ContactSyncRunResult } from "./types";

/**
 * Server-side contact sync: Dhaga plays the client.
 *
 * The mobile app drives its own runs — it reads the address book, posts what it
 * saw, and applies the writes it gets back. For Google and Outlook there is no
 * handset in the loop, so the server does both halves. Crucially it reuses the
 * SAME engine: reconcileContacts and acknowledgeWrites are untouched, and the
 * provider is bound behind a plain ContactSyncTarget, so the merge cannot tell
 * a People API account from an iPhone.
 *
 * PHASE SEPARATION IS LOAD-BEARING. Every network call happens OUTSIDE a
 * withUserDb scope:
 *
 *   1. DB      resolve the connection's access token
 *   2. network enumerate the remote address book
 *   3. DB      reconcile → the writes to apply
 *   4. network apply them to the provider
 *   5. DB      acknowledge the assigned ids, stamp the run
 *
 * Holding a tenant connection across an HTTP call is how this codebase has
 * repeatedly exhausted its max-3 pool and 500'd (the Ask-Dhaga and calendar
 * write-out post-mortems). A run that pages thousands of contacts over several
 * seconds would be the worst offender yet.
 */
async function runOne(userId: string, row: ContactConnectionRow): Promise<ContactSyncRunResult> {
  const base = emptyResult(row);

  const provider = providerFor(row);
  if (!provider) return { ...base, error: "This provider is no longer available." };
  // Capability is derived from the granted scope, so a read-only grant can never
  // be talked into writing by a stale column.
  if (!provider.capabilitiesFromScope(row.scope).write) {
    return { ...base, error: "This connection is read-only. Reconnect to grant write access." };
  }

  // 1. DB
  const accessToken = await withUserDb(userId, () => usableAccessToken(provider, row));
  if (!accessToken) return { ...base, error: "Sign in again to reconnect this account." };

  const target = provider.createTarget({ accessToken });

  // 2. network. Incremental when the connection holds a provider cursor; the
  //    page reports which it was, and ./enumerate.ts explains why that answer
  //    is the only thing allowed to decide `full` below.
  const [container] = await target.listContainers();
  const page = await enumerateRemote(target, row.syncCursor);

  // 3. DB
  const summary = await withUserDb(userId, async () =>
    reconcileContacts(
      await getDb(),
      {
        provider: row.provider as ContactSyncProviderId,
        containerId: container?.id ?? null,
        contacts: toObserved(page.contacts),
        // Only a COMPLETE enumeration can tell a deletion from a contact that
        // simply did not change, so only a complete one authorises the sweep.
        full: authorisesSweep(page),
      },
      {
        pushUnlinked: row.pushUnlinked,
        // Fields the provider cannot model (Graph's single url slot, its lone
        // birthday) are excluded from the merge entirely, or the second run
        // would read them back as deletions.
        unsupportedFields: target.unsupportedFields,
      },
    ),
  );

  // 4. network
  const { results, failed } = await applyWrites(target, summary.writes);

  // 5. DB
  await withUserDb(userId, async () => {
    if (results.length > 0) {
      await acknowledgeWrites(await getDb(), {
        provider: row.provider as ContactSyncProviderId,
        results,
      });
    }
    // Advancing the cursor is what makes the NEXT run incremental, so it is
    // withheld whenever this run left work behind — see nextCursor().
    await recordSyncRun(row.id, new Date(), nextCursor(page, failed));
  });

  return {
    ...base,
    pulled: summary.pulled,
    created: summary.created,
    linked: summary.linked,
    pushed: results.length,
    remaining: summary.remaining,
    conflicts: summary.conflicts.length,
    error: failed > 0 ? `${failed} change(s) could not be written and will retry.` : null,
  };
}

/**
 * Run every eligible connection. One failing account reports its own error and
 * the rest still run — a revoked Google grant must not stop Outlook syncing.
 *
 * Sequential on purpose: each connection opens its own DB scopes, and running
 * them concurrently would multiply checkouts against the small tenant pool.
 */
export async function runContactSync(userId: string): Promise<ContactSyncRunResult[]> {
  const rows = await withUserDb(userId, () => syncableConnectionRows());
  const results: ContactSyncRunResult[] = [];
  for (const row of rows) {
    try {
      results.push(await runOne(userId, row));
    } catch (error) {
      results.push({
        ...emptyResult(row),
        error: error instanceof Error ? error.message : "Sync failed.",
      });
    }
  }
  return results;
}
