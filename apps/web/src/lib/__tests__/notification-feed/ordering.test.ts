import { describe, expect, it } from "vitest";
import { buildNotificationFeed, feedKey } from "@/components/app/AppNav/NotificationBell";
import { empty, followUp, importantDate, notification } from "./helpers";

/**
 * The bell merges three sources the user reads as one list, so the order IS the
 * feature: it decides what a glance surfaces. These pin the rule rather than the
 * current output — each case names why that position is right.
 */
describe("buildNotificationFeed ordering", () => {
  it("puts unread notices first, then reminders in calendar order, then read notices", () => {
    // Unread is the only kind the user has provably never seen; a read notice is
    // history and must never outrank an overdue follow-up.
    const feed = buildNotificationFeed({
      reminders: {
        dueToday: 1,
        overdue: 1,
        items: [
          followUp("today", "2026-07-30T00:00:00.000Z", false),
          followUp("late", "2026-07-20T00:00:00.000Z", true),
        ],
      },
      importantDates: [importantDate("Zoe", "2026-08-02", 3)],
      notifications: [
        notification("read", "2026-07-29T10:00:00.000Z", "read"),
        notification("new", "2026-07-30T09:00:00.000Z", "unread"),
      ],
      unreadNotifications: 1,
    });

    expect(feed.items.map(feedKey)).toEqual([
      "notification:new",
      "follow-up:late",
      "follow-up:today",
      "important-date:c-Zoe:Birthday:2026-08-02",
      "notification:read",
    ]);
  });

  it("sorts a birthday by its local calendar date, never a UTC-shifted one", () => {
    // `date` is already a local YYYY-MM-DD; a Date round-trip lands a birthday a
    // day early east of Greenwich and would reorder it against the same day's
    // follow-up.
    const feed = buildNotificationFeed({
      ...empty,
      reminders: {
        dueToday: 1,
        overdue: 0,
        items: [followUp("today", "2026-07-30T00:00:00.000Z", false)],
      },
      importantDates: [importantDate("Zoe", "2026-07-30", 0)],
    });
    expect(feed.items.map(feedKey)).toEqual([
      "follow-up:today",
      "important-date:c-Zoe:Birthday:2026-07-30",
    ]);
  });

  it("never renders a dismissed notification", () => {
    // Dismissal is a persisted write; a dismissed row coming back would read as
    // the dismissal having silently failed.
    const feed = buildNotificationFeed({
      ...empty,
      notifications: [
        notification("gone", "2026-07-30T09:00:00.000Z", "dismissed"),
        notification("kept", "2026-07-30T08:00:00.000Z", "unread"),
      ],
      unreadNotifications: 1,
    });
    expect(feed.items.map(feedKey)).toEqual(["notification:kept"]);
  });

  it("caps the panel, and claims emptiness only when every source is empty", () => {
    // A dropdown is a glance, not a page — but the empty state must not lie.
    const many = Array.from({ length: 14 }, (_, i) =>
      notification(`n${i}`, `2026-07-${10 + i}T09:00:00.000Z`, "read"),
    );
    expect(buildNotificationFeed({ ...empty, notifications: many }).items).toHaveLength(10);
    expect(
      buildNotificationFeed({ ...empty, importantDates: [importantDate("Zoe", "2026-08-02", 3)] })
        .items,
    ).toHaveLength(1);
    expect(buildNotificationFeed(empty).items).toHaveLength(0);
  });
});
