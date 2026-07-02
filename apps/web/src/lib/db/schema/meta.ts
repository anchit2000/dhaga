import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Metering: every cloud AI call is logged (day-one requirement, BRD §8).
 * Free-tier caps are computed from this table, never from a counter cache.
 */
export const aiActions = pgTable("ai_actions", {
  id: text("id").primaryKey(),
  feature: text("feature").notNull(), // contact_parse | note_extraction | search | draft
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AiActionRow = typeof aiActions.$inferSelect;
