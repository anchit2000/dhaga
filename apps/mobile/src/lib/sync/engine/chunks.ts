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
 * An empty address book still produces ONE request, carrying `observedEmpty`.
 * Sending nothing was the obvious reading — there is nothing to reconcile — but
 * it made emptying the address book the single change sync could not see: every
 * link stayed "synced" against a record that no longer existed, forever. The
 * flag is a positive claim rather than an inference from `contacts: []`,
 * because a FAILED enumeration produces an empty list too and must never
 * unlink anything. This is only reached once enumeration has succeeded, and the
 * request is scoped to the container that was enumerated.
 */
export function buildPushChunks({
  provider,
  containerId,
  contacts,
}: PushChunkInput): SyncPushRequest[] {
  if (contacts.length === 0) {
    return [{ provider, containerId, contacts: [], full: false, observedEmpty: true }];
  }
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
 * No responses at all is a legitimate run that did nothing, not an error: zero
 * counts, nothing to write back. (An emptied address book no longer reaches
 * this state — it sends one request and gets one answer.)
 */
export function mergePushResponses(responses: readonly SyncPushResponse[]): SyncPushResponse {
  return {
    writes: responses.flatMap((response) => response.writes),
    conflicts: responses.flatMap((response) => response.conflicts),
    pulled: responses.reduce((total, response) => total + response.pulled, 0),
    created: responses.reduce((total, response) => total + response.created, 0),
    linked: responses.reduce((total, response) => total + response.linked, 0),
    // Summed like the rest, though only ONE response can carry a non-zero
    // remainder: `pushUnlinked` rides the last chunk alone (../engine/index.ts),
    // so every other chunk answers 0. Summing keeps that invariant visible — if
    // a caller ever asks on every chunk, the number goes obviously wrong rather
    // than quietly right, which is the same call this file makes about writes.
    remaining: responses.reduce((total, response) => total + response.remaining, 0),
  };
}
