import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
  /** Went through the Message Batches API (half price both directions). Set by
   *  the nightly batch jobs; false for every synchronous call. */
  batch: boolean("batch").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AiActionRow = typeof aiActions.$inferSelect;

/** Per-user app preferences (single-user app → a simple key/value table). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * A user's taught dictation vocabulary. `keys` are precomputed double-metaphone
 * codes for `term` + `aliases` (the phonetic lookup index). Per-user uniqueness
 * of `termLc` is enforced in the repo, not by a DB constraint — see
 * lib/repo/voice-vocab.ts and the DDL note in ddl/core/meta.ts.
 */
export const voiceVocab = pgTable("voice_vocab", {
  id: text("id").primaryKey(),
  term: text("term").notNull(),
  termLc: text("term_lc").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  keys: jsonb("keys").$type<string[]>().notNull().default([]),
  boost: integer("boost").notNull().default(8),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type VoiceVocabRow = typeof voiceVocab.$inferSelect;
