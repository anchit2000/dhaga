import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ConfirmationPayload } from "@dhaga/core";
import { contacts } from "./contacts";
import { notes } from "./notes";

/**
 * Unified "confirmations / doubts" feed — the generalization of
 * edge_suggestions. Extraction/enrichment writers only ever INSERT rows here;
 * the graph is mutated solely by the resolver once the user confirms (see
 * lib/repo/confirmations). `payload` is the shared @dhaga/core contract keyed
 * by `type`. FKs are nullable — not every confirmation traces to a note or a
 * single contact. `user_id` is intentionally absent: the EE RLS loop adds it.
 */
export const confirmations = pgTable("confirmations", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"), // pending | resolved | dismissed
  payload: jsonb("payload").$type<ConfirmationPayload>().notNull(),
  origin: text("origin"), // inline | messaging; NULL = inline (pre-column rows)
  sourceNoteId: text("source_note_id").references(() => notes.id),
  contactId: text("contact_id").references(() => contacts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type ConfirmationRow = typeof confirmations.$inferSelect;
