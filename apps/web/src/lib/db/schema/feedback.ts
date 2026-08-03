import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle mirror of ddl/core/feedback.ts. Every column is one named, reviewed
 * piece of debugging context — see that file for why there is no jsonb blob.
 * The nullable columns are the ones a browser may not be able to report.
 */
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  /** Route PATTERN (`/app/people/[id]`), never the concrete path. */
  route: text("route").notNull(),
  /** `"375x812"`. */
  viewport: text("viewport"),
  userAgent: text("user_agent"),
  locale: text("locale"),
  timezone: text("timezone"),
  appVersion: text("app_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FeedbackRow = typeof feedback.$inferSelect;
