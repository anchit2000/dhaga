import { createLink, listLinks, recordPush } from "./links";
import { loadLocalContacts } from "./read";
import type { SyncAckRequest, SyncAckResponse } from "@dhaga/core/src/api/sync";
import type { DhagaDb } from "@/lib/db";

/**
 * Record the ids an address book assigned to the writes it just applied.
 *
 * Without this step a created record would be unrecognisable on the next run —
 * its id does not exist until the platform mints it — and the sync would create
 * a second copy of every contact it had just pushed. Idempotent: re-acking the
 * same result updates the same link rather than adding another.
 *
 * The contact's CURRENT syncable state becomes the new base snapshot: the write
 * has landed, so both sides now hold this, and the next run must not read the
 * push it just completed as a fresh local edit.
 *
 * Runs on the ONE connection handed in — two queries up front, then per-result
 * writes against the in-memory index (never a lookup per result).
 */
export async function acknowledgeWrites(
  db: DhagaDb,
  request: SyncAckRequest,
): Promise<SyncAckResponse> {
  // One external record can only be acked once per call; a repeat is a client
  // retry, and the last report of it is the current one.
  const results = [...new Map(request.results.map((result) => [result.externalId, result])).values()];
  const contactIds = [...new Set(results.map((result) => result.contactId))];
  const local = await loadLocalContacts(db, contactIds);
  const links = await listLinks(db, request.provider);

  const contactById = new Map(local.map((row) => [row.id, row.contact]));
  const linkByExternal = new Map(links.map((link) => [link.externalId, link]));
  const linkByContact = new Map(links.map((link) => [link.contactId, link]));

  let acknowledged = 0;
  for (const result of results) {
    const contact = contactById.get(result.contactId);
    // An id we do not hold (stale client state, or another user's contact —
    // RLS already scopes the read) must not become an orphan link row.
    if (!contact) continue;
    const existing =
      linkByExternal.get(result.externalId) ?? linkByContact.get(result.contactId) ?? null;
    if (existing) {
      await recordPush(db, existing.id, {
        externalId: result.externalId,
        etag: result.etag,
        baseSnapshot: contact,
      });
    } else {
      await createLink(db, {
        contactId: result.contactId,
        provider: request.provider,
        externalId: result.externalId,
        // The ack does not carry a container; the next push records which one
        // the record actually lives in (recordPull sets it).
        containerId: null,
        etag: result.etag,
        baseSnapshot: contact,
        // A link born from OUR OWN write has nothing contested about it — the
        // record was created from Dhaga's value, so both sides already agree.
        conflicts: [],
        pushedAt: new Date(),
      });
    }
    acknowledged++;
  }
  return { acknowledged };
}
