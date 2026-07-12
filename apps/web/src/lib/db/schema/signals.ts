import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";

/**
 * Proactive-intelligence signals (BRD §5.2 v1.2, §6.7): job-change and news
 * watchlist hits, both produced by the same web-search detection job (see
 * lib/jobs/detect-signals/). Never auto-applied to the graph — "add as
 * note" is an explicit user action, so the receipts invariant holds.
 */
export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  kind: text("kind").notNull(), // "job_change" | "news"
  headline: text("headline").notNull(),
  detail: text("detail").notNull(),
  sourceUrl: text("source_url"),
  status: text("status").notNull(), // "new" | "dismissed" | "noted"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SignalRow = typeof signals.$inferSelect;
