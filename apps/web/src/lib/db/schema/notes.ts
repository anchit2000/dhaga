import { pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  kind: text("kind").notNull(), // "text" | "voice" | "capture_source"
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** Every AI-derived fact keeps its receipt: source_note_id. */
export const facts = pgTable("facts", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  type: text("type").notNull(), // role | intent | personal | preference
  text: text("text").notNull(),
  confidence: real("confidence").notNull(),
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** The graph. Typed edges between contacts/companies, receipt-linked. */
export const edges = pgTable("edges", {
  id: text("id").primaryKey(),
  srcType: text("src_type").notNull(), // "contact" | "company"
  srcId: text("src_id").notNull(),
  predicate: text("predicate").notNull(),
  dstType: text("dst_type").notNull(),
  dstId: text("dst_id").notNull(),
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const followUps = pgTable("follow_ups", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  action: text("action").notNull(),
  dueHint: text("due_hint"),
  status: text("status").notNull(), // "open" | "done" | "dismissed"
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NoteRow = typeof notes.$inferSelect;
export type FactRow = typeof facts.$inferSelect;
export type EdgeRow = typeof edges.$inferSelect;
export type FollowUpRow = typeof followUps.$inferSelect;
