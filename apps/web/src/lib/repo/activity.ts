import { listContacts } from "./contacts";
import { listEvents } from "./events";
import { listDueReachOuts } from "./reminders";
import { listNewSignals } from "./signals";
import { listQuietContacts } from "./strength";

/**
 * Home's chronological activity feed: a straightforward in-memory merge of
 * queries that already exist for the old Home cards (signals, events,
 * due/quiet reach-outs, recent contacts) — not a new event-sourcing system.
 * Open follow-ups are deliberately excluded: they're pending todos, not
 * things that already happened, so Home keeps them as a separate section.
 */

export type ActivityType = "signal" | "event" | "reach_out" | "quiet" | "new_contact";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  contactId: string | null;
  eventId: string | null;
  title: string;
  description: string;
  timestamp: Date;
}

export async function listRecentActivity(limit: number): Promise<ActivityItem[]> {
  const [signals, quiet, dueReachOuts, events, newContacts] = await Promise.all([
    listNewSignals(),
    listQuietContacts(),
    listDueReachOuts(),
    listEvents(limit),
    listContacts(undefined, undefined, limit),
  ]);

  const items: ActivityItem[] = [
    ...signals.map((signal) => ({
      id: `signal-${signal.id}`,
      type: "signal" as const,
      contactId: signal.contactId,
      eventId: null,
      title: signal.contactName,
      description: `New signal: ${signal.headline}`,
      timestamp: signal.createdAt,
    })),
    ...quiet.map((contact) => ({
      id: `quiet-${contact.id}`,
      type: "quiet" as const,
      contactId: contact.id,
      eventId: null,
      title: contact.name,
      description: `Going quiet — no contact in a while (${contact.strength.label.toLowerCase()})`,
      timestamp: contact.lastTouch,
    })),
    ...dueReachOuts.map((contact) => ({
      id: `reach-${contact.id}`,
      type: "reach_out" as const,
      contactId: contact.id,
      eventId: null,
      title: contact.name,
      description: `Reach-out overdue — every ${contact.everyDays} days`,
      timestamp: contact.lastTouch,
    })),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      contactId: null,
      eventId: event.id,
      title: event.name,
      description: `${event.contactCount} ${event.contactCount === 1 ? "person" : "people"} met`,
      timestamp: event.startedAt,
    })),
    ...newContacts.map((contact) => ({
      id: `contact-${contact.id}`,
      type: "new_contact" as const,
      contactId: contact.id,
      eventId: null,
      title: contact.name,
      description: "Added to your network",
      timestamp: contact.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}
