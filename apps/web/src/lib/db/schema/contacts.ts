import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type {
  Address,
  ContactMethod,
  CustomField,
  ImportantDate,
} from "@dhaga/core";

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
  nickname: text("nickname"),
  // title + companyId are the denormalised "primary position" (first current
  // role, else the first) mirrored from the positions table below, so existing
  // list/detail/search/graph reads keep working. positions is the source of truth.
  title: text("title"),
  companyId: text("company_id").references(() => companies.id),
  emails: jsonb("emails").$type<ContactMethod[]>().notNull(),
  phones: jsonb("phones").$type<ContactMethod[]>().notNull(),
  links: jsonb("links").$type<ContactMethod[]>().notNull(),
  addresses: jsonb("addresses").$type<Address[]>().notNull().default(sql`'[]'::jsonb`),
  importantDates: jsonb("important_dates")
    .$type<ImportantDate[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  customFields: jsonb("custom_fields")
    .$type<CustomField[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
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

// One row per job/role a contact has held. Source of truth for employment;
// the primary (first current, else first by sortOrder) is mirrored into
// contacts.title / company_id. company_id is nullable — a role can name no
// company (e.g. "Freelance consultant"), and a company can have no title.
export const positions = pgTable("positions", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  companyId: text("company_id").references(() => companies.id),
  title: text("title"),
  department: text("department"),
  isCurrent: boolean("is_current").notNull().default(false),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type PositionRow = typeof positions.$inferSelect;
