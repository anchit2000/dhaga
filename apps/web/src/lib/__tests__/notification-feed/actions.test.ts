import { describe, expect, it } from "vitest";
import { badgeCount, badgeLabel, feedKey, rowActions } from "@/components/app/AppNav/NotificationBell";
import { empty, followUp, importantDate, notification } from "./helpers";

/**
 * Three kinds mutate through three DIFFERENT actions. rowActions is the ONE
 * place an item's ids become action arguments, so these tests are the guard: a
 * birthday's contactId reaching completeFollowUpAction, or a notification id
 * reaching it, would complete or delete an unrelated row.
 */
describe("rowActions", () => {
  it("hands completeFollowUpAction's ids to a follow-up only", () => {
    const item = followUp("f1", "2026-07-30T00:00:00.000Z", false);
    expect(rowActions(item).complete).toEqual({ followUpId: "f1", contactId: "c-f1" });
    expect(rowActions(item).notificationId).toBeNull();
  });

  it("exposes no complete affordance for an important date — a birthday cannot be done", () => {
    const item = { ...importantDate("Zoe", "2026-08-02", 3), kind: "important-date" as const };
    expect(rowActions(item).complete).toBeNull();
    expect(rowActions(item).notificationId).toBeNull();
    expect(rowActions(item).href).toBe("/app/people/c-Zoe");
  });

  it("gives a notification a dismiss id and never a complete id", () => {
    const item = notification("n1", "2026-07-30T09:00:00.000Z", "unread");
    expect(rowActions(item).notificationId).toBe("n1");
    expect(rowActions(item).complete).toBeNull();
  });

  it("keys rows by kind so the same uuid from two tables cannot collide", () => {
    // The optimistic hide filters on this key; an id-only filter would vanish an
    // unrelated row when two tables issue the same uuid.
    expect(feedKey(followUp("same", "2026-07-30T00:00:00.000Z", false))).not.toBe(
      feedKey(notification("same", "2026-07-30T09:00:00.000Z", "unread")),
    );
  });
});

describe("badgeCount", () => {
  it("counts follow-ups from the uncapped totals, not from the preview list", () => {
    // reminders.items previews the SAME rows dueToday/overdue count; adding both
    // would double-count every previewed follow-up.
    const items = [
      followUp("a", "2026-07-30T00:00:00.000Z", false),
      followUp("b", "2026-07-20T00:00:00.000Z", true),
    ];
    expect(badgeCount({ ...empty, reminders: { dueToday: 1, overdue: 1, items } })).toBe(2);
  });

  it("counts unread notifications from the COUNT, so a capped feed still nags", () => {
    expect(
      badgeCount({
        ...empty,
        notifications: [notification("n1", "2026-07-30T09:00:00.000Z", "unread")],
        unreadNotifications: 25,
      }),
    ).toBe(25);
  });

  it("counts only important dates landing today — a birthday next week must not nag", () => {
    expect(
      badgeCount({
        ...empty,
        importantDates: [importantDate("Zoe", "2026-07-30", 0), importantDate("Ana", "2026-08-05", 6)],
      }),
    ).toBe(1);
  });

  it("sums the three kinds once each", () => {
    const feed = {
      ...empty,
      reminders: {
        dueToday: 2,
        overdue: 1,
        items: [followUp("a", "2026-07-30T00:00:00.000Z", false)],
      },
      importantDates: [importantDate("Zoe", "2026-07-30", 0), importantDate("Ana", "2026-08-05", 6)],
      notifications: [notification("n1", "2026-07-30T09:00:00.000Z", "unread")],
      unreadNotifications: 2,
    };
    // 1 overdue + 2 due today + 2 unread + 1 birthday today.
    expect(badgeCount(feed)).toBe(6);
    expect(badgeLabel(badgeCount(feed))).toBe("6");
  });

  it("caps the label at 9+ so the dot cannot overflow the bell", () => {
    expect(badgeLabel(9)).toBe("9");
    expect(badgeLabel(10)).toBe("9+");
    expect(badgeLabel(badgeCount({ ...empty, unreadNotifications: 42 }))).toBe("9+");
  });
});
