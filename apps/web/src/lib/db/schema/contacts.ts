import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  sector: text("sector"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  companyId: text("company_id").references(() => companies.id),
  emails: jsonb("emails").$type<string[]>().notNull(),
  phones: jsonb("phones").$type<string[]>().notNull(),
  links: jsonb("links").$type<string[]>().notNull(),
  location: text("location"),
  tags: jsonb("tags").$type<string[]>().notNull(),
  // Keep-in-touch cadence: remind when the last touch is older than this.
  reachOutEveryDays: integer("reach_out_every_days"),
  lastReachedOutAt: timestamp("last_reached_out_at", { withTimezone: true }),
  // Proactive intelligence (v1.2, BRD §6.7): opt-in per contact, own-graph +
  // web-search only — never automatic mass lookup.
  watchedForSignals: boolean("watched_for_signals").notNull().default(false),
  signalsScannedAt: timestamp("signals_scanned_at", { withTimezone: true }),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
