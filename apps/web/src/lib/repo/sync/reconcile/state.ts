import { buildDedupIndex } from "../dedup";
import { listLinks } from "../links";
import { loadLocalContacts } from "../read";
import { listSyncTombstones } from "../tombstones";
import type { SyncableContact } from "@dhaga/core";
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { ContactLinkRow } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";
import type { DedupIndex } from "../dedup";
import type { LocalContact } from "../read";

/** The read half of the reconcile, split out to keep ./index.ts to the
 *  orchestration itself. Reads only — and on the caller's `db`, never a
 *  connection of its own (see ./index.ts for why that matters). */

/** Everything the reconcile loads before it looks at a single observed contact.
 *  The lookups are seeded here and then kept current by the run itself — a
 *  contact created mid-batch is indexed so the next observation matches it. */
export interface ReconcileState {
  links: ContactLinkRow[];
  local: LocalContact[];
  tombstoned: Set<string>;
  linkByExternal: Map<string, ContactLinkRow>;
  localById: Map<string, SyncableContact>;
  linkedContactIds: Set<string>;
  index: DedupIndex;
}

export async function loadReconcileState(
  db: DhagaDb,
  provider: ContactSyncProviderId,
): Promise<ReconcileState> {
  const links = await listLinks(db, provider);
  const local = await loadLocalContacts(db);
  const tombstoned = await listSyncTombstones(db, provider);
  return {
    links,
    local,
    tombstoned,
    linkByExternal: new Map(links.map((link) => [link.externalId, link])),
    localById: new Map(local.map((row) => [row.id, row.contact])),
    linkedContactIds: new Set(links.map((link) => link.contactId)),
    index: buildDedupIndex(local),
  };
}
