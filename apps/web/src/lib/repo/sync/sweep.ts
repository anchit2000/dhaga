import { SYNC_LINK_UNLINKED, SYNC_MAX_CREATES } from "@/utils/constants/sync";
import { isAuthoredContact } from "./authored";
import { markLinksUnlinked } from "./links";
import type { SyncPushRequest, SyncWrite } from "@dhaga/core/src/api/sync";
import type { ContactLinkRow } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";
import type { LocalContact } from "./read";

/**
 * The two whole-set phases of a sync run. They are separated from the
 * per-contact merge (./reconcile.ts) because both reason about what is ABSENT
 * from the batch, which is only answerable once the loop has finished — and,
 * for deletion, only when the batch was complete to begin with.
 */

/**
 * The ids this request proves the container held, or null when it proves
 * nothing and no sweep may run.
 *
 * `observedExternalIds` wins over `full` because a chunked run sends
 * `full: false` on every chunk and puts the container's whole id set on the
 * last one — the id list is the complete picture, the chunk's contacts are not.
 * Neither present means a partial batch, which cannot distinguish "deleted on
 * the device" from "not sent this time".
 *
 * An EMPTY id list proves nothing and must not authorise a sweep. `[]` is
 * truthy in JavaScript, so a bare `if (request.observedExternalIds)` would let
 * any caller unlink every contact in the container by sending an empty array —
 * and "I observed nothing" is indistinguishable from "I failed to enumerate".
 * A genuinely emptied address book has to arrive as a deliberate signal, not as
 * the absence of one. Same reasoning for `full` with an empty batch.
 *
 * `observedEmpty` IS that deliberate signal: a positive claim that enumeration
 * ran and found nothing. Honoured only when the batch is genuinely empty too,
 * so a client that contradicts itself ("the container is empty, here are its
 * contacts") cannot sweep away the very links it just reported.
 */
function observedIds(
  request: SyncPushRequest,
  seenExternalIds: ReadonlySet<string>,
): ReadonlySet<string> | null {
  if (request.observedExternalIds?.length) return new Set(request.observedExternalIds);
  if (request.observedEmpty && seenExternalIds.size === 0) return seenExternalIds;
  if (request.full && seenExternalIds.size > 0) return seenExternalIds;
  return null;
}

/**
 * Tombstone links whose external record was not in a COMPLETE view of the
 * container — either the whole address book in one request (`full`) or the
 * final chunk of a run too big for that (`observedExternalIds`).
 *
 * Without one of those it returns having touched nothing: reading "not sent
 * this time" as "deleted" would unlink the user's whole address book on the
 * first incremental sync, and on the first CHUNK of a large one. Scoped to the
 * container the batch came from, since a full sweep of one account says nothing
 * about records in another.
 *
 * Never deletes a Dhaga contact. A record vanishing from an address book is not
 * consent to destroy the notes, facts and edges hanging off it here.
 */
export async function tombstoneMissingLinks(
  db: DhagaDb,
  links: ContactLinkRow[],
  request: SyncPushRequest,
  seenExternalIds: ReadonlySet<string>,
): Promise<void> {
  const observed = observedIds(request, seenExternalIds);
  if (!observed) return;
  await markLinksUnlinked(
    db,
    links
      .filter(
        (link) =>
          link.state !== SYNC_LINK_UNLINKED &&
          link.containerId === request.containerId &&
          !observed.has(link.externalId),
      )
      .map((link) => link.id),
  );
}

/** What one run offers outward, and what its ceiling made it hold back. */
export interface UnlinkedCreates {
  writes: SyncWrite[];
  /** Eligible contacts left for the next run — see SyncPushResponse.remaining. */
  remaining: number;
}

/**
 * Offer Dhaga contacts that have no link on this provider as creates — the
 * "a person I added in Dhaga should reach my phone" direction. Still
 * caller-gated, and nothing asks by default: a contact written into an address
 * book propagates to every device signed into that account, so both the phone's
 * sync screen and a connected Google/Outlook account have to be switched on
 * before they ask for it.
 *
 * Offered contacts are the ones the user CREATED in Dhaga, which is narrower
 * than "everything unlinked" — see isAuthoredContact (./authored.ts) for which
 * provenances are excluded and why. That predicate is shared with the bulk
 * seed export (@/lib/export/data) so the two ways a contact can reach an
 * address book cannot disagree about which contacts may.
 *
 * A contact whose link is tombstoned is not offered either — its id is in
 * `linkedContactIds` whatever the link's state — so deleting someone on the
 * phone is never undone by this direction on the next run.
 *
 * No link row is written here. The external id does not exist until the
 * platform mints it, so the link is established by the ack.
 *
 * The client applies writes one at a time, so a run offers at most
 * SYNC_MAX_CREATES and reports the rest as `remaining`. A cap the user cannot
 * see is a first sync that looks finished with hundreds of people still missing
 * from their phone.
 */
export function offerUnlinkedCreates(
  local: LocalContact[],
  linkedContactIds: ReadonlySet<string>,
): UnlinkedCreates {
  // Eligibility FIRST, cap second. The cap used to `break` mid-loop, leaving
  // every row past it untested — so the only leftover it could have reported was
  // "everything unreached", a number padded with stubs, imports and already
  // linked people that no amount of syncing would ever drain. Counting what
  // would actually have been offered is what makes "sync again" a promise the
  // next run can keep.
  const eligible = local.filter(
    (row) =>
      !linkedContactIds.has(row.id) &&
      isAuthoredContact({ source: row.source, name: row.contact.name }),
  );
  return {
    writes: eligible.slice(0, SYNC_MAX_CREATES).map((row) => ({
      externalId: null,
      contactId: row.id,
      fields: row.contact,
      etag: null,
    })),
    remaining: Math.max(eligible.length - SYNC_MAX_CREATES, 0),
  };
}
