import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
