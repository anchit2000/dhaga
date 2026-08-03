import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";

/**
 * The user's current objective, in their own words ("find a design partner for
 * the beta"). `objective` is stored verbatim — it is both the prompt the nightly
 * match pass reasons over and the line the user reads back on Home.
 *
 * Only one goal is active at a time (MAX_ACTIVE_GOALS); that ceiling lives in
 * the write guard, not here.
 */
export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  objective: text("objective").notNull(),
  status: text("status").notNull().default("active"), // "active" | "done" | "archived"
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * A contact the match pass judged relevant to a goal. Synthetic `id` rather
 * than a (goalId, contactId) composite PK — same call voiceVocab made, for the
 * self-host/EE-RLS reason documented in ddl/core/goals.ts; the pair is unique
 * by index instead.
 *
 * `state` has no "done": done is DERIVED from the contact's last touch moving
 * past `matchedAt` (lastTouchSql), so reaching out anywhere in the app counts.
 * `rank` is the model's fit 0..100, frozen at match time and never recomputed
 * on read.
 */
export const goalMembers = pgTable("goal_members", {
  id: text("id").primaryKey(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  state: text("state").notNull().default("pending"), // "pending" | "skipped"
  rank: integer("rank").notNull().default(0),
  matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GoalRow = typeof goals.$inferSelect;
export type GoalMemberRow = typeof goalMembers.$inferSelect;
