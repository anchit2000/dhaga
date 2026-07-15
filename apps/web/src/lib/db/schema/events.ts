import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";

/** Encounter events (M2): "Web Summit 2026" groups the people met there. */
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  /** Coarse geohash-6 of where the event's scans happened (M2, BRD §6.2).
   *  Null for events created manually (web quick-add) with no location. */
  geohash: text("geohash"),
  /** User-chosen decoration (see @/utils/constants/events). `color` stores a
   *  palette token (not hex); `emoji` a single grapheme; both null until set. */
  color: text("color"),
  emoji: text("emoji"),
  tags: jsonb("tags").$type<string[]>().notNull(),
});

export const eventContacts = pgTable(
  "event_contacts",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.contactId] })],
);

export type EventRow = typeof events.$inferSelect;
