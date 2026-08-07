import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Partial mirror of core's `user` table (apps/web/src/lib/db/schema/auth.ts)
 * — same physical table, only the columns EE actually needs. EE can't
 * import apps/web's own schema module (wrong direction across the open-core
 * boundary), so this is a deliberate, minimal duplication of the columns
 * that matter here (id, email, isAdmin, approvedAt).
 *
 * `approved_at` is EE-owned (added by EE_TABLES_DDL, not core's AUTH_DDL): the
 * pending-approval gate is a Dhaga Cloud concept only, and a self-hosted core
 * database never grows the column at all — its ApprovalGate default approves
 * everyone. Null means "signed up, not yet let in".
 */
export const eeUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at").notNull(),
});

/**
 * Mirror of core's `ai_actions` (apps/web/src/lib/db/schema/meta.ts), plus
 * the `user_id` column RLS_DDL adds — needed for admin usage views, which
 * must see every tenant's rows via the bypass-RLS connection.
 */
export const eeAiActions = pgTable("ai_actions", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  feature: text("feature").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const accessRequests = pgTable("access_requests", {
  email: text("email").primaryKey(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  // UX deep-link only (pre-fills the signup form) — never the security
  // boundary. Approval is proven by `status === 'approved'`, checked fresh.
  approvalToken: text("approval_token"),
});

export type AccessRequestRow = typeof accessRequests.$inferSelect;
export type AccessRequestStatus = "pending" | "approved" | "rejected";
