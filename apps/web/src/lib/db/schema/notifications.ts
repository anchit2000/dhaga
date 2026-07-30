import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { NotificationStatus, NotificationType } from "@/utils/constants/notifications";
import { contacts } from "./contacts";
import { extractionJobs } from "./jobs";

/**
 * Persisted, dismissible per-user notifications — modelled on `confirmations`
 * (same shape: text PK, text `type`, defaulted text `status`, nullable FKs, a
 * created/resolved timestamp pair). Written today by the extraction worker when
 * a background job reaches a terminal state. `user_id` is intentionally absent:
 * the EE RLS loop adds it (packages/ee/src/db/rls-ddl.ts).
 *
 * Both FKs are ON DELETE CASCADE, which is where this DIVERGES from
 * confirmations/signals (plain RESTRICT references cleaned up by hand in
 * cascadeForget). Two reasons: `title`/`body` embed the contact's name, so a
 * forgotten contact's notifications must die with it (privacy rule — deletion
 * cascades fully), and cascadeForget lives outside this change's ownership, so a
 * RESTRICT reference here would abort every contact delete.
 */
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  type: text("type").$type<NotificationType>().notNull(),
  /** The one line the user reads in the bell — already human and specific. */
  title: text("title").notNull(),
  /** Optional second line: an error message, or the paid-feature notice. */
  body: text("body"),
  status: text("status").$type<NotificationStatus>().notNull().default("unread"),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => extractionJobs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type NotificationRow = typeof notifications.$inferSelect;
