import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Inbound-messaging capture tables. There is a deliberate ROUTING-vs-TENANT
 * split here:
 *
 * - messaging_identities and messaging_link_tokens are ROUTING tables. A
 *   webhook resolves which Dhaga user an inbound message belongs to BEFORE any
 *   tenant scope exists, so they carry an EXPLICIT `user_id` column and are
 *   read cross-tenant (they are intentionally NOT in packages/ee's
 *   TENANT_TABLES — mirroring how the `user` table is read without a tenant
 *   scope). Without an explicit user_id, RLS's session-defaulted user_id would
 *   make the routing lookup impossible (there is no current user yet).
 *
 * - messaging_sessions and messaging_session_items hold the FORWARDED CONTENT
 *   (a batch of items awaiting processing). That is per-tenant PII, so they
 *   carry NO user_id column here — packages/ee/src/db/rls-ddl.ts adds it via
 *   TENANT_TABLES along with the RLS policy and the session-variable default.
 */

/** ROUTING (cross-tenant): maps a channel's sender id to a Dhaga user. */
export const messagingIdentities = pgTable("messaging_identities", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  externalName: text("external_name"),
  userId: text("user_id").notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MessagingIdentityRow = typeof messagingIdentities.$inferSelect;

/** ROUTING (cross-tenant): short-lived single-use account-linking tokens. */
export const messagingLinkTokens = pgTable("messaging_link_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export type MessagingLinkTokenRow = typeof messagingLinkTokens.$inferSelect;

/** TENANT data: one batch of forwarded content (no user_id — EE's RLS adds it). */
export const messagingSessions = pgTable("messaging_sessions", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  status: text("status").notNull().default("open"),
  lastItemAt: timestamp("last_item_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MessagingSessionRow = typeof messagingSessions.$inferSelect;

/** TENANT data: individual forwarded items within a session (no user_id — EE's RLS adds it). */
export const messagingSessionItems = pgTable("messaging_session_items", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  seq: integer("seq").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
  providerMessageId: text("provider_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  /** Set when the walk finished this item — makes a killed batch resumable. */
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type MessagingSessionItemRow = typeof messagingSessionItems.$inferSelect;

/**
 * TENANT data: the one open "which person did you mean?" question per chat.
 * Short-lived by design (expires_at) and deliberately NOT a conversation state
 * machine — it holds only the pending note plus the candidates that were
 * offered, so a numeric/name reply can resolve it. Carries no user_id here:
 * like the session tables, EE's RLS DDL adds it.
 */
export const messagingPendingQuestions = pgTable("messaging_pending_questions", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  subjectName: text("subject_name"),
  noteBody: text("note_body").notNull(),
  options: jsonb("options").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type MessagingPendingQuestionRow = typeof messagingPendingQuestions.$inferSelect;
