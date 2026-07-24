import { boolean, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { entities } from "./entities";

/** A note belongs to exactly one of contact/entity (app-enforced). */
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").references(() => contacts.id),
  entityId: text("entity_id").references(() => entities.id),
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
  // Web-sourced (enrichment) facts land here as unverified: extracted so the
  // user sees everything, badged so they can confirm or delete each one —
  // especially when the search surfaced more than one person by that name.
  unverified: boolean("unverified").notNull().default(false),
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** The graph. Typed edges, receipt-linked; manual edges have a NULL receipt.
 *  Endpoint types: "contact" | "company" | "event" | "entity" (legacy "person"
 *  rows are normalized to "contact" by the DDL self-heal). */
export const edges = pgTable("edges", {
  id: text("id").primaryKey(),
  srcType: text("src_type").notNull(),
  srcId: text("src_id").notNull(),
  predicate: text("predicate").notNull(),
  dstType: text("dst_type").notNull(),
  dstId: text("dst_id").notNull(),
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * A pending relationship the extractor found but could not link unambiguously
 * (e.g. the note says "Ajay" and two contacts are named Ajay, or it names a
 * custom entity that doesn't exist yet). Held for the user to confirm which
 * contact/entity it means — or to create one — before an edge is written.
 * Receipt-linked.
 */
export const edgeSuggestions = pgTable("edge_suggestions", {
  id: text("id").primaryKey(),
  srcContactId: text("src_contact_id")
    .notNull()
    .references(() => contacts.id),
  predicate: text("predicate").notNull(),
  objectName: text("object_name").notNull(),
  objectType: text("object_type").notNull(), // "person" | "entity"
  // Entity suggestions only: the extractor's node-type guess (slug) that
  // preselects the type in the inbox's "create new" path.
  entityTypeHint: text("entity_type_hint"),
  candidateIds: jsonb("candidate_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("pending"), // pending | confirmed | dismissed
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const followUps = pgTable("follow_ups", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  action: text("action").notNull(),
  // Free-text timing hint the LLM fills with prose ("next quarter"). Manual
  // entries use dueDate instead — a machine date from the date picker.
  dueHint: text("due_hint"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: text("status").notNull(), // "open" | "done" | "dismissed"
  sourceNoteId: text("source_note_id").references(() => notes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NoteRow = typeof notes.$inferSelect;
export type FactRow = typeof facts.$inferSelect;
export type EdgeRow = typeof edges.$inferSelect;
export type EdgeSuggestionRow = typeof edgeSuggestions.$inferSelect;
export type FollowUpRow = typeof followUps.$inferSelect;
