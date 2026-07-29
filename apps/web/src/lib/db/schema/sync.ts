import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import type { PersistedSyncConflict, SyncableContact } from "@dhaga/core/src/sync/types";

import { contacts } from "./contacts";

/**
 * One Dhaga contact ↔ one contact in one external address book (the device
 * address book, Google People, Microsoft Graph). `provider` is the
 * ContactSyncProvider id from packages/core/sync.
 *
 * `externalId` is the provider's own id — an iOS UUID, an Android `_ID`, a
 * People API resourceName. None of those are guaranteed stable across a
 * restore-from-backup or an account re-sync, so callers must fall back to the
 * existing email/phone/name dedup (lib/repo/import.ts) when a lookup misses
 * rather than treating a miss as "new contact".
 *
 * `containerId` records WHICH account on the device the contact lives in (iOS
 * CardDAV/Exchange container, Android account). It is what makes the relay
 * work: writing into the iCloud container means iOS propagates the change up
 * to iCloud on its own, so Dhaga never needs a Google/Apple write scope.
 *
 * Under EE the `user_id` column + RLS are added by packages/ee (rls-ddl.ts
 * TENANT_TABLES), exactly like every other per-tenant table — this schema
 * stays tenancy-unaware.
 */
export const contactLinks = pgTable("contact_links", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  containerId: text("container_id"),
  // Provider concurrency token (People API etag, Graph @odata.etag) so a push
  // can be rejected rather than silently clobbering a newer remote write.
  etag: text("etag"),
  // Last-synced copy of the syncable fields — the "base" of the 3-way merge.
  baseSnapshot: jsonb("base_snapshot")
    .$type<Partial<SyncableContact>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  // Unresolved divergences: the Dhaga value the merge had to discard, the phone
  // value that won, and when. The push response reports them too, but only this
  // column outlives the request — see repo/sync/conflicts.ts for the retention
  // rule (an entry lives exactly as long as its losing value is unrecovered).
  conflicts: jsonb("conflicts")
    .$type<PersistedSyncConflict[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  lastPulledAt: timestamp("last_pulled_at", { withTimezone: true }),
  lastPushedAt: timestamp("last_pushed_at", { withTimezone: true }),
  // "linked" | "unlinked" — the sweep tombstones a link whose external record
  // has gone, and revives it if the record reappears. Nothing is ever hard
  // deleted here, so a contact detached on the device can always come back.
  state: text("state").notNull().default("linked"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ContactLinkRow = typeof contactLinks.$inferSelect;
