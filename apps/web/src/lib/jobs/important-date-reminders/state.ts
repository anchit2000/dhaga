import { getSetting, setSetting } from "@/lib/repo/settings";
import type { UpcomingImportantDate } from "@/lib/repo/reminders";

/**
 * Which important-date reminders have already been emailed. Reuses the key/value
 * settings table (constraint-name upsert, EE-safe — see repo/settings.ts) rather
 * than a new table: it is one JSON array of short strings per user, nothing
 * relational, and the linkedin_export_reminders_sent key already set this
 * precedent for "which nudge did we send".
 */
export const IMPORTANT_DATE_REMINDERS_SENT_KEY = "important_date_reminders_sent";

/**
 * The two moments one occurrence is worth an email: once when it enters the
 * user's lead window (time to buy a gift / book a table) and once on the day
 * itself (time to actually send the message). Anything more is spam — the cron
 * runs daily, so an un-staged job would email the same birthday every day of the
 * lead window.
 */
export type ReminderStage = "lead" | "day-of";

export function reminderStage(item: UpcomingImportantDate): ReminderStage {
  return item.daysUntil <= 0 ? "day-of" : "lead";
}

/**
 * Stable identity of one send: contact + which of their dates + which annual
 * occurrence + which stage. JSON-encoded rather than "|"-joined because `label`
 * is free user text ("Wedding | anniversary" is a real thing people type) — a
 * label containing the delimiter would collide with another item's token and
 * silently suppress a real reminder.
 */
export function reminderToken(item: UpcomingImportantDate, stage: ReminderStage): string {
  return JSON.stringify([item.contactId, item.label, item.date, stage]);
}

/** The occurrence date inside a token, or "" for anything unparseable. */
function tokenDate(token: string): string {
  try {
    const parsed: unknown = JSON.parse(token);
    const date = Array.isArray(parsed) ? parsed[2] : null;
    return typeof date === "string" ? date : "";
  } catch {
    return "";
  }
}

/**
 * Drop tokens for occurrences that have passed: next year's birthday is a
 * different occurrence (the date is part of the token), so keeping them would
 * grow this row forever. Unparseable tokens are dropped too — self-healing, and
 * they can never suppress a send since no live token can equal them.
 */
export function pruneExpiredTokens(tokens: string[], todayIso: string): string[] {
  return tokens.filter((token) => tokenDate(token) >= todayIso);
}

export async function getSentReminderTokens(): Promise<string[]> {
  const value = await getSetting(IMPORTANT_DATE_REMINDERS_SENT_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

/**
 * Whole-array write, unlike linkedin-reminders' atomic appendToSettingArray:
 * this job is a once-a-day single-tenant sweep with no concurrent writer, and
 * pruning needs to remove entries, which an append-only helper cannot do.
 */
export async function saveSentReminderTokens(tokens: string[]): Promise<void> {
  await setSetting(IMPORTANT_DATE_REMINDERS_SENT_KEY, JSON.stringify(tokens));
}
