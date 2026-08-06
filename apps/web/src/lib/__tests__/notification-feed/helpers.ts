import type { NotificationFeedInput } from "@/components/app/AppNav/NotificationBell";
import type { CalendarFollowUp, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { NotificationItem } from "@/lib/repo/notifications";

/** Fixtures shared by the ordering and action-mapping specs. */

export function followUp(id: string, dueDate: string, overdue: boolean): CalendarFollowUp {
  return {
    kind: "follow-up",
    id,
    contactId: `c-${id}`,
    contactName: `Contact ${id}`,
    companyId: null,
    companyName: null,
    associationLabel: `Contact ${id}`,
    recurrence: null,
    action: "Send the deck",
    dueDate,
    dueHint: null,
    overdue,
  };
}

export function importantDate(
  name: string,
  date: string,
  daysUntil: number,
): UpcomingImportantDate {
  return {
    contactId: `c-${name}`,
    contactName: name,
    label: "Birthday",
    value: "1990-03-14",
    date,
    daysUntil,
    turning: 34,
  };
}

export function notification(
  id: string,
  createdAt: string,
  status: NotificationItem["status"],
): NotificationItem {
  return {
    kind: "notification",
    id,
    type: "job_done",
    title: "Extracted 4 facts from your note",
    body: null,
    status,
    contactId: "c-priya",
    contactName: "Priya Sharma",
    href: "/app/people/c-priya",
    createdAt,
  };
}

export const empty: NotificationFeedInput = {
  reminders: { dueToday: 0, overdue: 0, items: [] },
  importantDates: [],
  notifications: [],
  unreadNotifications: 0,
};
