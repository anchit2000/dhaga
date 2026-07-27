import { describe, expect, it } from "vitest";
import {
  followUpReminderSubject,
  hasDueFollowUps,
} from "@/lib/jobs/follow-up-reminders";
import { followUpReminderHtml } from "@/lib/email/follow-up-reminder";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * The follow-up reminder emails ONLY overdue + due-today items, once a day, and
 * must never leak raw graph text into HTML. These cases pin the three pure rules
 * the daily sweep leans on — subject pluralisation, the "nothing due ⇒ no email"
 * send-guard, and per-item escaping/overdue labelling — so they break if any of
 * those product rules change, not merely if the string formatting wobbles.
 */
function makeItem(overrides: Partial<CalendarFollowUp>): CalendarFollowUp {
  return {
    id: "f1",
    contactId: "c1",
    contactName: "Ada Lovelace",
    action: "Send the deck",
    dueDate: "2026-07-27T00:00:00.000Z",
    dueHint: null,
    overdue: false,
    ...overrides,
  };
}

describe("followUpReminderSubject", () => {
  it("is singular for a single due follow-up so the copy reads naturally", () => {
    expect(followUpReminderSubject(1)).toBe("1 follow-up due");
  });

  it("pluralises for multiple due follow-ups", () => {
    expect(followUpReminderSubject(3)).toBe("3 follow-ups due");
  });
});

describe("hasDueFollowUps", () => {
  it("is false when nothing is due — the guard that stops an empty reminder email being sent", () => {
    // The sweep skips a tenant when this is false; a zero-item email would be
    // noise, and privacy-first means we never email a user with nothing to say.
    expect(hasDueFollowUps([])).toBe(false);
  });

  it("is true once at least one follow-up is overdue or due today", () => {
    expect(hasDueFollowUps([makeItem({})])).toBe(true);
  });
});

describe("followUpReminderHtml", () => {
  const opts = { appUrl: "https://app.example/app/calendar" };

  it("labels an overdue item as overdue so the reader sees it is late, not upcoming", () => {
    const html = followUpReminderHtml(
      [makeItem({ overdue: true, action: "Reply to intro" })],
      opts,
    );
    expect(html).toContain("Overdue");
    expect(html).toContain("Reply to intro");
    expect(html).toContain("Ada Lovelace");
  });

  it("does not label a due-today (not overdue) item as overdue", () => {
    const html = followUpReminderHtml([makeItem({ overdue: false })], opts);
    expect(html).not.toContain("Overdue");
  });

  it("HTML-escapes user-derived contact names and actions so graph data can't inject markup", () => {
    const html = followUpReminderHtml(
      [makeItem({ contactName: "<script>alert(1)</script>", action: "A & B <x>" })],
      opts,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt;x&gt;");
  });
});
