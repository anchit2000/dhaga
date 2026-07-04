import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Partial mirror of core's `user` table (apps/web/src/lib/db/schema/auth.ts)
 * — same physical table, only the columns EE actually needs. EE can't
 * import apps/web's own schema module (wrong direction across the open-core
 * boundary), so this is a deliberate, minimal duplication of the columns
 * that matter here (id, email, isAdmin).
 */
export const eeUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin"),
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

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"), // null for Lifetime (one-time payment)
  plan: text("plan").notNull(), // 'lifetime' | 'pro'
  status: text("status").notNull(), // 'active' | 'past_due' | 'canceled' | 'incomplete'
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionPlan = "lifetime" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete";
