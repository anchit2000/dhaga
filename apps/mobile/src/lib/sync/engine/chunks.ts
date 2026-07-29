import { SYNC_MAX_CONTACTS } from "@/utils/constants/sync";

import type {
  ContactSyncProviderId,
  ObservedContact,
  SyncPushRequest,
  SyncPushResponse,
} from "@dhaga/core/src/api/sync";

/**
 * Splitting one address book across several push requests, and putting the
 * answers back together. Kept pure and out of the engine so the boundary maths
 * is testable without a device or a server: an off-by-one here either drops
 * contacts from the sync or, far worse, hands the server a partial view of the
 * container while telling it the view is complete — which would tombstone every
 * link the chunk happens not to contain.
 */

export interface PushChunkInput {
  provider: ContactSyncProviderId;
  containerId: string | null;
  /** Everything the client observed in this ONE container, in read order. */
  contacts: readonly ObservedContact[];
}

/**
 * The requests one run has to send, in the order it must send them.
 *
 * Every chunk is `full: false` — a chunk is never the complete address book,
 * and the server reads `full` as "everything absent from this was deleted".
 * Only the LAST chunk carries `observedExternalIds`, the container's whole id
 * set, because that is the first moment enumeration is known to be finished.
 * Ids are cheap, so completeness costs one small field rather than a second
 * pass over the address book.
 *
 * An empty address book produces NO requests: the push schema requires at least
 * one contact, so there is nothing legal to send and nothing to reconcile.
 */
export function buildPushChunks({
  provider,
  containerId,
  contacts,
}: PushChunkInput): SyncPushRequest[] {
  const chunks: SyncPushRequest[] = [];
  for (let start = 0; start < contacts.length; start += SYNC_MAX_CONTACTS) {
    const isLast = start + SYNC_MAX_CONTACTS >= contacts.length;
    chunks.push({
      provider,
      containerId,
      contacts: contacts.slice(start, start + SYNC_MAX_CONTACTS),
      full: false,
      observedExternalIds: isLast ? contacts.map((contact) => contact.externalId) : null,
    });
  }
  return chunks;
}

/**
 * The chunks' answers as one run's answer. Counts add; writes and conflicts
 * concatenate in chunk order.
 *
 * Nothing is deduplicated. The server links a contact in the chunk that
 * observed it, before the next chunk is reconciled, so it does not offer the
 * same contact twice — and collapsing a duplicate here would hide that
 * invariant breaking rather than let the user see two writes for one person.
 *
 * No responses (empty address book) is a legitimate run that did nothing, not
 * an error: zero counts, nothing to write back.
 */
export function mergePushResponses(responses: readonly SyncPushResponse[]): SyncPushResponse {
  return {
    writes: responses.flatMap((response) => response.writes),
    conflicts: responses.flatMap((response) => response.conflicts),
    pulled: responses.reduce((total, response) => total + response.pulled, 0),
    created: responses.reduce((total, response) => total + response.created, 0),
    linked: responses.reduce((total, response) => total + response.linked, 0),
  };
}
