import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Instance-wide AI budget configuration (enforcement switch, per-plan
 * allowances, the running promotion). NOT `settings` — that table is re-keyed
 * per-user and RLS-scoped by packages/ee, which would make an operator-level
 * value invisible to everyone but the admin who wrote it. See ddl/ai-budget.ts.
 */
export const aiBudgetSettings = pgTable("ai_budget_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AiBudgetSettingRow = typeof aiBudgetSettings.$inferSelect;

/**
 * Additive AI-credit grants — the make-good ledger. `userId` NULL means every
 * user on the instance. Grants are added ON TOP of whichever ceiling wins; they
 * never modify `ai_actions`, which stays the sole record of real spend.
 */
export const aiCreditGrants = pgTable("ai_credit_grants", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  credits: integer("credits").notNull(),
  reason: text("reason").notNull(),
  grantedBy: text("granted_by").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AiCreditGrantRow = typeof aiCreditGrants.$inferSelect;
