import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { notes } from "./notes";

/**
 * Stored card/badge photos — the visual receipt behind a scanned contact.
 * Kept in the user's own database (embedded local or their hosted Postgres),
 * never a third-party bucket. Storage is a per-user setting; a deleted
 * receipt note or forgotten contact hard-deletes its photo.
 */
export const cardImages = pgTable("card_images", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  noteId: text("note_id").references(() => notes.id),
  mediaType: text("media_type").notNull(), // image/jpeg | image/png | image/webp
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CardImageRow = typeof cardImages.$inferSelect;
