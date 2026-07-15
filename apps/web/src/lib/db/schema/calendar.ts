import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A connected calendar the app reads FREE/BUSY from (never writes to). Tokens
 * are stored as AES-256-GCM ciphertext (see lib/crypto/tokens.ts), never
 * plaintext. `provider` is the CalendarProvider id from packages/core/calendar
 * ("google" | "microsoft" | "demo" | a community provider). Under EE the
 * `user_id` column + RLS are added by packages/ee (rls-ddl.ts TENANT_TABLES),
 * exactly like every other per-tenant table — this schema stays tenancy-unaware.
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CalendarConnectionRow = typeof calendarConnections.$inferSelect;
