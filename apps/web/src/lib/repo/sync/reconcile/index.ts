import { mergeSyncedContact } from "@dhaga/core";
import { nextLinkConflicts } from "../conflicts";
import { buildDedupIndex, indexContact, matchExisting } from "../dedup";
import { createLink, listLinks, recordPull } from "../links";
import { loadLocalContacts, normalizeSyncable } from "../read";
import { offerUnlinkedCreates, tombstoneMissingLinks } from "../sweep";
import { clearSyncTombstones, listSyncTombstones } from "../tombstones";
import { applySyncedContact, createSyncedContact } from "../write";
import { neutralise, pickFields } from "./fields";
import type { ReconcileOptions } from "./fields";
import type {
  SyncConflictReport,
  SyncPushRequest,
  SyncPushResponse,
  SyncWrite,
} from "@dhaga/core/src/api/sync";
import type { DhagaDb } from "@/lib/db";
import type { CompanyMemo } from "../write";

export type { ReconcileOptions } from "./fields";

/**
 * Reconcile one batch of observed contacts against the graph.
 *
 * Runs entirely on the ONE connection handed in — no getDb() in here, no
 * Promise.all over contacts. A per-contact fan-out exhausts the max-3 tenant
 * pool and 500s the request; that regression has shipped here more than once
 * (see lib/db/request-scope.ts and lib/repo/contacts/write.ts resolvePositions).
 */
export async function reconcileContacts(
  db: DhagaDb,
  request: SyncPushRequest,
  options: ReconcileOptions = {},
): Promise<SyncPushResponse> {
  const now = new Date();
  const links = await listLinks(db, request.provider);
  const local = await loadLocalContacts(db);
  const tombstoned = await listSyncTombstones(db, request.provider);

  const linkByExternal = new Map(links.map((link) => [link.externalId, link]));
  const localById = new Map(local.map((row) => [row.id, row.contact]));
  const linkedContactIds = new Set(links.map((link) => link.contactId));
  const index = buildDedupIndex(local);
  const memo: CompanyMemo = new Map();

  const writes: SyncWrite[] = [];
  const conflicts: SyncConflictReport[] = [];
  const seen = new Set<string>();
  const readopted: string[] = [];
  let pulled = 0;
  let created = 0;
  let linked = 0;

  for (const observed of request.contacts) {
    seen.add(observed.externalId);
    const observedContact = normalizeSyncable(observed);
    const link = linkByExternal.get(observed.externalId) ?? null;
    // External ids are not stable across a restore, so a miss falls back to the
    // importer's dedup ladder before it is allowed to mean "new person".
    let contactId = link?.contactId ?? matchExisting(index, observedContact);
    if (!contactId) {
      // Deleted in Dhaga while the record survived on the device. Re-importing
      // them is not a sync, it is an undo of the user's decision — skip the
      // record. Its id stays in `seen`, so the sweep still counts it present.
      if (tombstoned.has(observed.externalId)) continue;
      contactId = await createSyncedContact(observedContact);
      created++;
      // A contact created from this very observation IS its own base, so the
      // merge below is a no-op rather than a first-link conflict against data we
      // just wrote. Indexing it also stops two device records for one person in
      // the same batch from creating that person twice.
      localById.set(contactId, observedContact);
      indexContact(index, contactId, observedContact);
    }
    // Reaching here with a tombstone means a contact exists for the pair again,
    // so it has done its job (../tombstones.ts — the un-delete path).
    if (tombstoned.has(observed.externalId)) readopted.push(observed.externalId);

    const localContact = localById.get(contactId);
    // Fields the provider's model cannot represent are handed the local value so
    // the merge sees no divergence — see neutralise() for the silent deletion
    // this prevents on the second run.
    const remote = neutralise(observedContact, localContact, options.unsupportedFields);

    const result = mergeSyncedContact({
      base: link?.baseSnapshot ?? null,
      local: localContact ?? remote,
      remote,
    });

    if (result.changedLocally.length > 0) {
      await applySyncedContact(db, contactId, result.merged, result.changedLocally, memo);
      localById.set(contactId, result.merged);
      pulled++;
    }
    if (result.conflicts.length > 0) {
      conflicts.push({ contactId, contactName: result.merged.name, conflicts: result.conflicts });
    }
    if (result.changedRemotely.length > 0) {
      writes.push({
        externalId: observed.externalId,
        contactId,
        fields: pickFields(result.merged, result.changedRemotely),
        // The etag the client just observed is the freshest token we have, so
        // the provider can reject the patch if the record moved since.
        etag: observed.etag,
      });
    }

    // The losing Dhaga value is persisted on the link, not just returned above:
    // the response body is discarded by the client, and once it is, an edit the
    // user made in Dhaga would be gone with no way back. Written on the SAME
    // update the base snapshot already needed — no extra query, no extra
    // connection. See ../conflicts.ts for when an entry survives and when it goes.
    const linkConflicts = nextLinkConflicts(
      link?.conflicts ?? [],
      result.conflicts,
      result.merged,
      now,
    );

    if (link) {
      await recordPull(db, link.id, {
        baseSnapshot: result.merged,
        conflicts: linkConflicts,
        etag: observed.etag,
        containerId: request.containerId,
      });
    } else {
      await createLink(db, {
        contactId,
        provider: request.provider,
        externalId: observed.externalId,
        containerId: request.containerId,
        etag: observed.etag,
        baseSnapshot: result.merged,
        conflicts: linkConflicts,
        pulledAt: now,
      });
      linked++;
      linkedContactIds.add(contactId);
    }
  }

  await clearSyncTombstones(db, request.provider, readopted);
  await tombstoneMissingLinks(db, links, request, seen);
  if (options.pushUnlinked) writes.push(...offerUnlinkedCreates(local, linkedContactIds));

  return { writes, conflicts, pulled, created, linked };
}
