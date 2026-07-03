import { pgTable, primaryKey, text, timestamp, vector } from "drizzle-orm/pg-core";

/**
 * Semantic index over notes, facts, and contact identities (BRD §6.4 M6).
 * 384 dims = bge-small / MiniLM class models. No FK on contact_id so
 * cascade deletes stay explicit and order-independent.
 */
export const embeddings = pgTable(
  "embeddings",
  {
    ownerType: text("owner_type").notNull(), // "note" | "fact" | "contact"
    ownerId: text("owner_id").notNull(),
    contactId: text("contact_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerType, table.ownerId] })],
);

export type EmbeddingRow = typeof embeddings.$inferSelect;
