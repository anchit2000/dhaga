import { eq, sql } from "drizzle-orm";
import { sameSyncFieldValue } from "@dhaga/core/src/sync/merge";
import { contactLinks, contacts } from "@/lib/db/schema";
import { SYNC_CONFLICT_KEEP_DHAGA } from "@/utils/constants/sync";
import { loadLocalContacts, normalizeSyncable } from "./read";
import { applySyncedContact } from "./write";
import type {
  PersistedSyncConflict,
  SyncableContact,
  SyncConflict,
  SyncField,
} from "@dhaga/core/src/sync/types";
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { SyncConflictChoice } from "@/utils/constants/sync";
import type { DhagaDb } from "@/lib/db";
import type { CompanyMemo } from "./write";

/**
 * Conflicts that outlive the request.
 *
 * The merge adopts the phone's value on a both-edited field on purpose — an edit
 * typed on the handset must survive. That only stays honest if the value it
 * discarded is kept somewhere the user can reach it, and the push response is
 * not that: the client drops the body and the value is gone.
 *
 * Every function here takes the caller's `db` — one sync run reconciles the
 * whole batch on ONE scoped connection (./index.ts), and a helper that resolves
 * its own is how the pool-exhausting fan-out gets reintroduced.
 */

/**
 * What the link should store after this reconcile. The rule in one sentence:
 * **a conflict lives exactly as long as the Dhaga value it recorded is still
 * missing from Dhaga.** That makes it neither lossy nor unbounded:
 *  - a fresh conflict replaces any older one on the same field (the user's own
 *    newer Dhaga edit supersedes it), so a field never accumulates a pile;
 *  - an untouched link keeps its entry across later runs — after a conflict both
 *    sides agree, so clearing on "no conflict this run" would delete the record
 *    one run after making it;
 *  - once the losing value is back — restored here, or re-typed on the phone —
 *    there is nothing left to decide and the entry drops.
 */
export function nextLinkConflicts(
  stored: readonly PersistedSyncConflict[],
  fresh: readonly SyncConflict[],
  merged: SyncableContact,
  now: Date,
): PersistedSyncConflict[] {
  const freshFields = new Set(fresh.map((conflict) => conflict.field));
  const carried = stored.filter(
    (conflict) =>
      !freshFields.has(conflict.field) &&
      !sameSyncFieldValue(conflict.field, merged[conflict.field], conflict.local),
  );
  const at = now.toISOString();
  return [...carried, ...fresh.map((conflict) => ({ ...conflict, at }))];
}

export interface PendingSyncConflict {
  linkId: string;
  contactId: string;
  contactName: string;
  provider: ContactSyncProviderId;
  conflicts: PersistedSyncConflict[];
}

/**
 * Every link still holding an undecided divergence, newest first. ONE query,
 * joined to contacts for the name — the review surface must not cost a lookup
 * per row.
 */
export async function listPendingSyncConflicts(db: DhagaDb): Promise<PendingSyncConflict[]> {
  const rows = await db
    .select({
      linkId: contactLinks.id,
      contactId: contactLinks.contactId,
      contactName: contacts.name,
      provider: contactLinks.provider,
      conflicts: contactLinks.conflicts,
    })
    .from(contactLinks)
    .innerJoin(contacts, eq(contacts.id, contactLinks.contactId))
    .where(sql`jsonb_array_length(${contactLinks.conflicts}) > 0`)
    .orderBy(contacts.name);
  return rows.map((row) => ({
    linkId: row.linkId,
    contactId: row.contactId,
    contactName: row.contactName,
    provider: row.provider as ContactSyncProviderId,
    conflicts: row.conflicts,
  }));
}

/**
 * Settle one field of one link.
 *
 * Keeping Dhaga's value writes it back to the contact and NOTHING else — in
 * particular the base snapshot is left alone. That is deliberate: the base
 * already holds the phone's value, so on the next run Dhaga is the side that
 * moved and the merge pushes the restored value outward on its own. Rewriting
 * the base here would instead make the phone look like the mover and the value
 * would be adopted away a second time.
 *
 * Returns false when the entry is already gone (resolved in another tab, or
 * cleared by a sync in between) so the caller can say so rather than pretend.
 */
export async function resolveSyncConflict(
  db: DhagaDb,
  input: { linkId: string; field: SyncField; choice: SyncConflictChoice },
): Promise<boolean> {
  const [link] = await db
    .select({
      contactId: contactLinks.contactId,
      conflicts: contactLinks.conflicts,
    })
    .from(contactLinks)
    .where(eq(contactLinks.id, input.linkId))
    .limit(1);
  if (!link) return false;

  const entry = link.conflicts.find((conflict) => conflict.field === input.field);
  if (!entry) return false;

  if (input.choice === SYNC_CONFLICT_KEEP_DHAGA) {
    const [current] = await loadLocalContacts(db, [link.contactId]);
    if (!current) return false;
    const restored: SyncableContact = { ...current.contact };
    // Computed-key assign: the losing value is `unknown` by contract (one entry
    // shape covers all nine fields), and this is the same narrowing the outbound
    // pickFields does in ./reconcile.ts.
    Object.assign(restored, { [input.field]: entry.local });
    const memo: CompanyMemo = new Map();
    await applySyncedContact(db, link.contactId, normalizeSyncable(restored), [input.field], memo);
  }

  await db
    .update(contactLinks)
    .set({
      conflicts: link.conflicts.filter((conflict) => conflict.field !== input.field),
      updatedAt: new Date(),
    })
    .where(eq(contactLinks.id, input.linkId));
  return true;
}
