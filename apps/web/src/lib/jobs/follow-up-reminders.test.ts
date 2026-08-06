import { describe, expect, it } from "vitest";
import {
  followUpReminderSubject,
  hasDueFollowUps,
} from "@/lib/jobs/follow-up-reminders";
import { followUpReminderHtml } from "@/lib/email/follow-up-reminder";
// Deep import: the barrel (repo/reminders/index.ts) intentionally exports only
// the two query functions; these predicates are the decision the email and the
// bell disagree on, and this file is what pins that disagreement.
import { isDueSoon, isDueWithinEmailLeadWindow } from "@/lib/repo/reminders/calendar";
import { FOLLOW_UP_LEAD_DAYS } from "@/utils/constants/reminders";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * The follow-up reminder emails overdue, due-today AND due-within-
 * FOLLOW_UP_LEAD_DAYS items, once a day, and must never leak raw graph text into
 * HTML. These cases pin the rules the daily sweep leans on — subject
 * pluralisation, the "nothing due ⇒ no email" send-guard, the email's lead
 * window (and the fact that the nav bell deliberately does NOT share it), and
 * per-item escaping/urgency labelling — so they break if any of those product
 * rules change, not merely if the string formatting wobbles.
 */

/**
 * "Now" = this morning, built from LOCAL parts so calendar-day maths is
 * timezone-stable. Anchored to the real today rather than a hardcoded date
 * because isDueSoon reads the ambient clock (date-fns isToday) — the bell has no
 * injectable clock, so pinning a fake date would make these assertions expire.
 */
const TODAY = new Date();
const NOW = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 9, 0, 0);

/** Local midnight `days` from NOW, serialised the way the repo layer serialises dueDate. */
function dueIn(days: number): string {
  return new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days).toISOString();
}

function makeItem(overrides: Partial<CalendarFollowUp>): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "f1",
    contactId: "c1",
    contactName: "Ada Lovelace",
    companyId: null,
    companyName: null,
    associationLabel: "Ada Lovelace",
    recurrence: null,
    action: "Send the deck",
    dueDate: dueIn(0),
    dueHint: null,
    // Open by design: the reminder email is the OUTSTANDING set. Done rows now
    // reach the calendar, and must never reach this.
    status: "open",
    overdue: false,
    ...overrides,
  };
}

describe("followUpReminderSubject", () => {
  it("is singular for a single due follow-up so the copy reads naturally", () => {
    expect(followUpReminderSubject(1)).toBe("1 follow-up due soon");
  });

  it("pluralises for multiple due follow-ups", () => {
    expect(followUpReminderSubject(3)).toBe("3 follow-ups due soon");
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

/**
 * The lead window is EMAIL-ONLY. isDueSoon feeds getNotificationSummary (the nav
 * bell's overdue/due-today badge and preview); isDueWithinEmailLeadWindow feeds
 * getDueFollowUpRemindersForUser (the email). If someone ever "simplifies" the
 * two into one predicate, the bell silently starts counting future work as
 * needing attention now — these cases are what fails.
 */
describe("follow-up email lead window vs the nav bell", () => {
  it("emails a follow-up due in 3 days — before the window it was only ever emailed once already late", () => {
    const item = makeItem({ dueDate: dueIn(FOLLOW_UP_LEAD_DAYS) });
    expect(isDueWithinEmailLeadWindow(item, NOW)).toBe(true);
  });

  it("does NOT email a follow-up due in 30 days — a reminder that early is noise, not a nudge", () => {
    expect(isDueWithinEmailLeadWindow(makeItem({ dueDate: dueIn(30) }), NOW)).toBe(false);
  });

  it("still emails overdue and due-today items (the lead window only widens the set)", () => {
    expect(isDueWithinEmailLeadWindow(makeItem({ dueDate: dueIn(0) }), NOW)).toBe(true);
    expect(
      isDueWithinEmailLeadWindow(makeItem({ dueDate: dueIn(-4), overdue: true }), NOW),
    ).toBe(true);
  });

  it("never emails an undated follow-up — there is no date to be soon", () => {
    expect(isDueWithinEmailLeadWindow(makeItem({ dueDate: null }), NOW)).toBe(false);
  });

  it("leaves the bell's predicate narrow: a follow-up due in 3 days is not 'due soon' for the badge", () => {
    // The nav bell badge means "act now". Counting a 3-days-out item there would
    // inflate it every single day of the lead window.
    expect(isDueSoon(makeItem({ dueDate: dueIn(FOLLOW_UP_LEAD_DAYS) }))).toBe(false);
    expect(isDueSoon(makeItem({ dueDate: dueIn(1) }))).toBe(false);
    // ...while overdue and due-today still count, exactly as before.
    expect(isDueSoon(makeItem({ dueDate: dueIn(0) }))).toBe(true);
    expect(isDueSoon(makeItem({ dueDate: dueIn(-4), overdue: true }))).toBe(true);
  });
});

describe("followUpReminderHtml", () => {
  const opts = { appUrl: "https://app.example/app/calendar", now: NOW };

  it("labels an overdue item as overdue so the reader sees it is late, not upcoming", () => {
    const html = followUpReminderHtml(
      [makeItem({ overdue: true, dueDate: dueIn(-4), action: "Reply to intro" })],
      opts,
    );
    expect(html).toContain("Overdue");
    expect(html).toContain("Reply to intro");
    expect(html).toContain("Ada Lovelace");
  });

  it("does not label a due-today (not overdue) item as overdue", () => {
    const html = followUpReminderHtml([makeItem({ overdue: false })], opts);
    expect(html).not.toContain("Overdue");
    expect(html).toContain("Due today");
  });

  it("labels a due-in-3-days item honestly instead of implying it is late", () => {
    // The whole point of the lead window: the reader must be able to tell the
    // thing they missed from the thing they still have time for.
    const html = followUpReminderHtml([makeItem({ dueDate: dueIn(3) })], opts);
    expect(html).toContain("Due in 3 days");
    expect(html).not.toContain("Overdue");
  });

  it("says 'tomorrow' rather than 'in 1 days'", () => {
    expect(followUpReminderHtml([makeItem({ dueDate: dueIn(1) })], opts)).toContain(
      "Due tomorrow",
    );
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
