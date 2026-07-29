import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { contactLinks } from "@/lib/db/schema";
import { SYNC_LINK_LINKED, SYNC_LINK_UNLINKED } from "@/utils/constants/sync";
import type { ContactSyncProviderId } from "@dhaga/core/src/api/sync";
import type { PersistedSyncConflict, SyncableContact } from "@dhaga/core/src/sync/types";
import type { ContactLinkRow } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

/**
 * contact_links CRUD. Every function takes the caller's `db` handle rather than
 * calling getDb() itself: one sync run reconciles a whole batch on ONE scoped
 * connection (see ./index.ts), and a repo helper that opens its own is how the
 * per-item connection fan-out gets reintroduced.
 *
 * There is deliberately no unique index on (provider, external_id) — under EE
 * every row also carries a user_id core cannot see, and Android contact ids
 * collide across users (lib/db/ddl/sync.ts). Uniqueness is upheld here: one
 * pass over the user's links for this provider indexes them by external id, and
 * every write below targets an existing row by id or inserts a genuinely new pair.
 */
export async function listLinks(
  db: DhagaDb,
  provider: ContactSyncProviderId,
): Promise<ContactLinkRow[]> {
  return db.select().from(contactLinks).where(eq(contactLinks.provider, provider));
}

export interface NewLink {
  contactId: string;
  provider: ContactSyncProviderId;
  externalId: string;
  containerId: string | null;
  etag: string | null;
  baseSnapshot: SyncableContact;
  /** Divergences the merge could not resolve — persisted so the Dhaga value it
   *  discarded survives the response body it used to live and die in. */
  conflicts: PersistedSyncConflict[];
  pulledAt?: Date | null;
  pushedAt?: Date | null;
}

export async function createLink(db: DhagaDb, link: NewLink): Promise<string> {
  const id = randomUUID();
  await db.insert(contactLinks).values({
    id,
    contactId: link.contactId,
    provider: link.provider,
    externalId: link.externalId,
    containerId: link.containerId,
    etag: link.etag,
    baseSnapshot: link.baseSnapshot,
    conflicts: link.conflicts,
    lastPulledAt: link.pulledAt ?? null,
    lastPushedAt: link.pushedAt ?? null,
    state: SYNC_LINK_LINKED,
  });
  return id;
}

/** Record a completed reconcile: the merged result becomes the new base, and the
 *  link's undecided divergences are rewritten wholesale (see ./conflicts.ts —
 *  the caller computes which survive, so a settled one clears itself here). */
export async function recordPull(
  db: DhagaDb,
  id: string,
  values: {
    baseSnapshot: SyncableContact;
    conflicts: PersistedSyncConflict[];
    etag: string | null;
    containerId: string | null;
  },
): Promise<void> {
  const now = new Date();
  await db
    .update(contactLinks)
    .set({
      baseSnapshot: values.baseSnapshot,
      conflicts: values.conflicts,
      etag: values.etag,
      containerId: values.containerId,
      lastPulledAt: now,
      updatedAt: now,
      // Observing the pair again revives a tombstoned link; the tombstone's job
      // is to stop re-CREATION, not to refuse a record that came back.
      state: SYNC_LINK_LINKED,
    })
    .where(eq(contactLinks.id, id));
}

/** Record the client's ack: the write landed, so this id/etag is now current. */
export async function recordPush(
  db: DhagaDb,
  id: string,
  values: { externalId: string; etag: string | null; baseSnapshot: SyncableContact },
): Promise<void> {
  const now = new Date();
  await db
    .update(contactLinks)
    .set({
      externalId: values.externalId,
      etag: values.etag,
      baseSnapshot: values.baseSnapshot,
      lastPushedAt: now,
      updatedAt: now,
      state: SYNC_LINK_LINKED,
    })
    .where(eq(contactLinks.id, id));
}

/**
 * Tombstone links whose external record is gone. The Dhaga contact is NEVER
 * deleted — sync tells us a record vanished from an address book, which is not
 * consent to destroy the notes, facts and edges hanging off it here.
 */
export async function markLinksUnlinked(db: DhagaDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(contactLinks)
    .set({ state: SYNC_LINK_UNLINKED, updatedAt: new Date() })
    .where(inArray(contactLinks.id, ids));
}
