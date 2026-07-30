import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A connected calendar. Tokens are stored as AES-256-GCM ciphertext (see
 * lib/crypto/tokens.ts), never plaintext. `provider` is the CalendarProvider id
 * from packages/core/calendar ("google" | "microsoft" | "demo" | a community
 * provider). Under EE the `user_id` column + RLS are added by packages/ee
 * (rls-ddl.ts TENANT_TABLES), exactly like every other per-tenant table — this
 * schema stays tenancy-unaware.
 *
 * What a connection may do is DERIVED from `scope` (packages/core
 * calendar/capability.ts), not stored: free/busy-only by default, full tier only
 * after the user re-consents. `writeCalendarId`/`writeEnabled` are write-out
 * bookkeeping, not capability — see ddl/calendar.ts.
 */
export const calendarConnections = pgTable("calendar_connections", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  accountEmail: text("account_email"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scope: text("scope"),
  status: text("status").notNull().default("connected"), // "connected" | "needs_reconnect"
  /** Id of the secondary "Dhaga" calendar we created — never the primary one. */
  writeCalendarId: text("write_calendar_id"),
  /** The user's own switch for writing follow-ups out; independent of scope. */
  writeEnabled: boolean("write_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Which follow-up we wrote as which event on which connection — the receipt the
 *  delete path needs so a completed/dismissed follow-up never lingers. */
export const calendarEventLinks = pgTable("calendar_event_links", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id")
    .notNull()
    .references(() => calendarConnections.id, { onDelete: "cascade" }),
  followUpId: text("follow_up_id").notNull(),
  externalEventId: text("external_event_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CalendarConnectionRow = typeof calendarConnections.$inferSelect;
export type CalendarEventLinkRow = typeof calendarEventLinks.$inferSelect;
