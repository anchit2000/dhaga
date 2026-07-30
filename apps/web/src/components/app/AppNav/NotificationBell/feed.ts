import type { CalendarFollowUp, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { NotificationItem } from "@/lib/repo/notifications";

/**
 * The nav bell carries three kinds of thing, from two very different places:
 * follow-ups and important dates are DERIVED on every render (no rows exist to
 * mark read), while a notification is a persisted row that can be read and
 * dismissed. Merging them is pure so the ordering, the badge arithmetic and —
 * above all — the id→action mapping are testable without a DOM or a DB.
 */

/** Only the important-date source ships untagged, so tag it here. */
export type ImportantDateItem = UpcomingImportantDate & { kind: "important-date" };

/** Discriminated by `kind`; every consumer must switch, never assume. */
export type FeedItem = CalendarFollowUp | ImportantDateItem | NotificationItem;

/** Exactly the shape getNotificationSummary() returns — consumed as-is. */
export interface ReminderSummary {
  dueToday: number;
  overdue: number;
  items: CalendarFollowUp[];
}

export interface NotificationFeedInput {
  reminders: ReminderSummary;
  importantDates: UpcomingImportantDate[];
  notifications: NotificationItem[];
  /** Uncapped COUNT — the feed list is limited, the badge must not be. */
  unreadNotifications: number;
}

export interface NotificationFeed {
  items: FeedItem[];
  badgeCount: number;
}

/** A dropdown is a glance, not a page: overflow lives on /app/follow-ups etc. */
export const BELL_FEED_LIMIT = 10;

/** Sorts a dateless reminder last instead of pretending it is overdue. */
const FAR_FUTURE = "9999-12-31";

const GROUP_UNREAD = 0;
const GROUP_REMINDER = 1;
const GROUP_READ = 2;

/**
 * Unread notifications first (the only kind the user has provably never seen,
 * and the only kind that leaves the feed when acted on), then the derived
 * reminders in calendar order — overdue sorts before today, which sorts before
 * an upcoming birthday, for free — then already-read notices as history.
 */
function groupOf(item: FeedItem): number {
  if (item.kind !== "notification") return GROUP_REMINDER;
  return item.status === "unread" ? GROUP_UNREAD : GROUP_READ;
}

/**
 * The local calendar day a reminder is about. An important date is ALREADY a
 * local YYYY-MM-DD string — never round-trip it through Date/UTC, which lands a
 * birthday a day early east of Greenwich.
 */
function reminderDay(item: FeedItem): string {
  if (item.kind === "important-date") return item.date;
  if (item.kind === "follow-up") return item.dueDate ? item.dueDate.slice(0, 10) : FAR_FUTURE;
  return FAR_FUTURE;
}

function reminderName(item: FeedItem): string {
  return item.kind === "notification" ? (item.contactName ?? "") : item.contactName;
}

function createdAt(item: FeedItem): string {
  return item.kind === "notification" ? item.createdAt : "";
}

function byFeedOrder(a: FeedItem, b: FeedItem): number {
  const group = groupOf(a) - groupOf(b);
  if (group !== 0) return group;
  if (groupOf(a) === GROUP_REMINDER) {
    return reminderDay(a).localeCompare(reminderDay(b)) || reminderName(a).localeCompare(reminderName(b));
  }
  return createdAt(b).localeCompare(createdAt(a));
}

/**
 * Counts, never list lengths: the follow-up counts are uncapped totals while
 * `reminders.items` is a preview of the same rows, so adding both would
 * double-count. Important dates are counted only when they land today —
 * a birthday six days out belongs in the panel, not on a nagging badge.
 */
export function badgeCount(input: NotificationFeedInput): number {
  const today = input.importantDates.filter((d) => d.daysUntil <= 0).length;
  return input.reminders.overdue + input.reminders.dueToday + input.unreadNotifications + today;
}

/** Two glyphs max, so the dot never overflows the bell. */
export function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/** Unique across kinds: two tables can hand us the same uuid. */
export function feedKey(item: FeedItem): string {
  if (item.kind === "important-date") return `important-date:${item.contactId}:${item.label}:${item.date}`;
  return `${item.kind}:${item.id}`;
}

function toImportantDateItem(date: UpcomingImportantDate): ImportantDateItem {
  return { ...date, kind: "important-date" };
}

/** Merge → sort → cap, plus the badge total. Pure; no dates, no DB, no DOM. */
export function buildNotificationFeed(input: NotificationFeedInput): NotificationFeed {
  const items = [
    ...input.reminders.items,
    ...input.importantDates.map(toImportantDateItem),
    // Belt to the repo's `status != 'dismissed'` filter: the status type permits
    // a dismissed row, and a dismissed notice reappearing in the bell would read
    // as the dismissal having silently failed.
    ...input.notifications.filter((n) => n.status !== "dismissed"),
  ].sort(byFeedOrder);
  return { items: items.slice(0, BELL_FEED_LIMIT), badgeCount: badgeCount(input) };
}
