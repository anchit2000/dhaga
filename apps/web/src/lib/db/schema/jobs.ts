import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { notes } from "./notes";

/**
 * Queue of background extraction work. A note-add or an enrichment persists a
 * row here and returns immediately; the worker route drains it and writes the
 * facts/follow-ups. `user_id` (added by packages/ee's RLS) scopes rows per
 * tenant, exactly like every other core table.
 */
export const extractionJobs = pgTable("extraction_jobs", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  // Set immediately for note_extraction; filled in mid-run for enrichment,
  // which creates its findings note only after the web search returns.
  noteId: text("note_id").references(() => notes.id),
  kind: text("kind").notNull(), // "note_extraction" | "enrichment"
  status: text("status").notNull().default("pending"), // see EXTRACTION_JOB_STATUSES
  stage: text("stage"), // "searching" | "extracting" | null
  error: text("error"),
  factCount: integer("fact_count").notNull().default(0),
  followUpCount: integer("follow_up_count").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ExtractionJobRow = typeof extractionJobs.$inferSelect;
