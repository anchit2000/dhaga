import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * An OAuth grant to one external address-book account (Google People, Microsoft
 * Graph) — the server-side counterpart to the device target, which needs no
 * credentials at all.
 *
 * Separate from `calendar_connections` deliberately: contacts and calendar are
 * independent consents with independent scopes, and sharing a row would let a
 * reconnect on one narrow the other's grant. See lib/db/ddl/contact-connections.ts.
 *
 * Tokens are AES-256-GCM ciphertext (lib/crypto/tokens.ts) and must never be
 * selected into anything that reaches the client. Under EE the `user_id` column
 * + RLS come from packages/ee (rls-ddl.ts TENANT_TABLES); this schema stays
 * tenancy-unaware like every other table here.
 */
export const contactConnections = pgTable("contact_connections", {
  id: text("id").primaryKey(),
  /** ContactSyncProvider id: "google" | "microsoft". */
  provider: text("provider").notNull(),
  accountEmail: text("account_email"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  /** The granted scope string. Capability is DERIVED from this, never stored. */
  scope: text("scope"),
  /** "connected" | "needs_reconnect" — set when a refresh fails. */
  status: text("status").notNull().default("connected"),
  /** The user's own on/off switch; independent of the grant. */
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  /** Copy Dhaga-only people into the account. Opt-in, default false — see the DDL. */
  pushUnlinked: boolean("push_unlinked").notNull().default(false),
  /**
   * The provider's opaque incremental cursor (Google syncToken, Graph
   * deltaLink) — never a timestamp. Non-null means the next run may enumerate
   * incrementally, which also means that run must NOT authorise the deletion
   * sweep. See lib/db/ddl/contact-connections.ts.
   */
  syncCursor: text("sync_cursor"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ContactConnectionRow = typeof contactConnections.$inferSelect;
