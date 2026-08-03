import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
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

// Alternate names a company is known by (acquisitions, abbreviations, prior
// names). Uniqueness is enforced in app code, not the schema. FK cascade is in
// the DDL; the Drizzle side only needs the column shape.
export const companyAliases = pgTable("company_aliases", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  alias: text("alias").notNull(),
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
  // Explicit user favourite — distinct from watchedForSignals (which drives the
  // proactive signal scans). Powers the Saved page's Starred tab + home tile.
  starred: boolean("starred").notNull().default(false),
  // Noise suppression for bulk-imported address-book rows ("Vegetable Vendor",
  // "Ola Support"). "person" | "service" | "unknown"; NULL = never judged. NULL
  // and "unknown" both behave as not-suppressed, but they are different
  // instructions to the nightly sweep — NULL means "batch it", "unknown" means
  // "the model declined, leave it alone". Only "service" suppresses, and only
  // from PROACTIVE surfaces (lib/repo/contacts/surfaceable.ts) — the row stays
  // fully findable everywhere the user navigated on purpose.
  personKind: text("person_kind"),
  // "model" | "user". "user" is a lock: the sweep never re-judges a user ruling.
  personKindBy: text("person_kind_by").notNull().default("model"),
  // Model certainty 0..1 (NULL when the user set it). Orders the review list;
  // never decides suppression.
  personKindConfidence: real("person_kind_confidence"),
  personClassifiedAt: timestamp("person_classified_at", { withTimezone: true }),
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
  // Affiliation predicate for this role (studied_at, interned_at, board_member_of,
  // …). NULL means a plain employment role — affiliationPredicate() then derives
  // works_at / worked_at from isCurrent.
  relation: text("relation"),
  isCurrent: boolean("is_current").notNull().default(false),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  note: text("note"),
  // Receipt for an extraction-derived row (the note the job or degree came
  // from); NULL when the user typed or imported it. The FK to notes(id) lives
  // in the DDL only — declaring it here would cycle, since notes.ts already
  // imports this module (same treatment as companyAliases above).
  sourceNoteId: text("source_note_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type CompanyAliasRow = typeof companyAliases.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type PositionRow = typeof positions.$inferSelect;
