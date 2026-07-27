import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { notes } from "@/lib/db/schema";
import { appendToSettingArray, getSetting, setSetting } from "@/lib/repo/settings";
import { LINKEDIN_IMPORT_RECEIPT_PREFIX } from "@/utils/constants/linkedin";

/** When the user last asked LinkedIn for their data export (ISO string); the
 *  reminder sequence's T0. Absent / empty ⇒ no sequence is in flight. */
export const LINKEDIN_EXPORT_REQUESTED_KEY = "linkedin_export_requested_at";
/** JSON array of reminder offset-days already emailed for the current sequence. */
export const LINKEDIN_REMINDERS_SENT_KEY = "linkedin_export_reminders_sent";

export async function getLinkedinExportRequestedAt(): Promise<Date | null> {
  const value = await getSetting(LINKEDIN_EXPORT_REQUESTED_KEY);
  if (!value) return null;
  const when = new Date(value);
  return Number.isNaN(when.getTime()) ? null : when;
}

/** Starts (or restarts) a reminder sequence: records T0 and clears any prior
 *  sent-offsets so a fresh cadence runs from scratch. */
export async function setLinkedinExportRequestedAt(when: Date): Promise<void> {
  await setSetting(LINKEDIN_EXPORT_REQUESTED_KEY, when.toISOString());
  await setSetting(LINKEDIN_REMINDERS_SENT_KEY, "[]");
}

export async function getLinkedinRemindersSent(): Promise<number[]> {
  const value = await getSetting(LINKEDIN_REMINDERS_SENT_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => !Number.isNaN(n));
  } catch {
    return [];
  }
}

export async function markLinkedinReminderSent(offsetDays: number): Promise<void> {
  await appendToSettingArray(LINKEDIN_REMINDERS_SENT_KEY, String(offsetDays));
}

/** Ends the sequence: no more reminders until the user requests another export. */
export async function clearLinkedinExportReminder(): Promise<void> {
  await setSetting(LINKEDIN_EXPORT_REQUESTED_KEY, "");
  await setSetting(LINKEDIN_REMINDERS_SENT_KEY, "[]");
}

/**
 * Whether the current tenant has imported LinkedIn contacts since `since`. The
 * only durable trace of a LinkedIn import is the receipt note each imported
 * contact carries (kind "capture_source", body prefixed with
 * LINKEDIN_IMPORT_RECEIPT_PREFIX) — there is no structured source column — so
 * this matches that receipt within the caller's tenant scope.
 */
export async function hasLinkedinImportSince(since: Date): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: notes.id })
    .from(notes)
    .where(
      and(
        eq(notes.kind, "capture_source"),
        gt(notes.createdAt, since),
        isNull(notes.deletedAt),
        sql`${notes.body} like ${`${LINKEDIN_IMPORT_RECEIPT_PREFIX}%`}`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}
