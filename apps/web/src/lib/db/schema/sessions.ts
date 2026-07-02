import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";

/** Encounter sessions (M2): "Web Summit 2026" groups the people met there. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionContacts = pgTable(
  "session_contacts",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.contactId] })],
);

export type SessionRow = typeof sessions.$inferSelect;
