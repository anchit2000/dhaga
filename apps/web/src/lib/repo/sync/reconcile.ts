import { mergeSyncedContact } from "@dhaga/core";
import { nextLinkConflicts } from "./conflicts";
import { buildDedupIndex, indexContact, matchExisting } from "./dedup";
import { createLink, listLinks, recordPull } from "./links";
import { loadLocalContacts, normalizeSyncable } from "./read";
import { offerUnlinkedCreates, tombstoneMissingLinks } from "./sweep";
import { applySyncedContact, createSyncedContact } from "./write";
import type { SyncableContact, SyncField } from "@dhaga/core";
import type {
  SyncConflictReport,
  SyncPushRequest,
  SyncPushResponse,
  SyncWrite,
} from "@dhaga/core/src/api/sync";
import type { DhagaDb } from "@/lib/db";
import type { CompanyMemo } from "./write";

export interface ReconcileOptions {
  /**
   * Also offer Dhaga contacts that have NO link on this provider as creates.
   * Off by default — see offerUnlinkedCreates in ./sweep.ts.
   */
  pushUnlinked?: boolean;
}

/** The merged value of exactly the fields that moved. Partial by contract: the
 *  client applies these and leaves every other field on the record untouched. */
function pickFields(
  contact: SyncableContact,
  fields: readonly SyncField[],
): Partial<SyncableContact> {
  const out: Partial<SyncableContact> = {};
  for (const field of fields) Object.assign(out, { [field]: contact[field] });
  return out;
}

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

  const linkByExternal = new Map(links.map((link) => [link.externalId, link]));
  const localById = new Map(local.map((row) => [row.id, row.contact]));
  const linkedContactIds = new Set(links.map((link) => link.contactId));
  const index = buildDedupIndex(local);
  const memo: CompanyMemo = new Map();

  const writes: SyncWrite[] = [];
  const conflicts: SyncConflictReport[] = [];
  const seen = new Set<string>();
  let pulled = 0;
  let created = 0;
  let linked = 0;

  for (const observed of request.contacts) {
    seen.add(observed.externalId);
    const remote = normalizeSyncable(observed);
    const link = linkByExternal.get(observed.externalId) ?? null;
    // External ids are not stable across a restore, so a miss falls back to the
    // importer's dedup ladder before it is allowed to mean "new person".
    let contactId = link?.contactId ?? matchExisting(index, remote);
    if (!contactId) {
      contactId = await createSyncedContact(remote);
      created++;
      // A contact created from this very observation IS its own base, so the
      // merge below is a no-op rather than a first-link conflict against data we
      // just wrote. Indexing it also stops two device records for one person in
      // the same batch from creating that person twice.
      localById.set(contactId, remote);
      indexContact(index, contactId, remote);
    }

    const result = mergeSyncedContact({
      base: link?.baseSnapshot ?? null,
      local: localById.get(contactId) ?? remote,
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
    // connection. See ./conflicts.ts for when an entry survives and when it goes.
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

  await tombstoneMissingLinks(db, links, request, seen);
  if (options.pushUnlinked) writes.push(...offerUnlinkedCreates(local, linkedContactIds));

  return { writes, conflicts, pulled, created, linked };
}
