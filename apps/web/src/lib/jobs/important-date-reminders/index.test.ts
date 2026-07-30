import { beforeEach, describe, expect, it, vi } from "vitest";
import { importantDateReminderHtml } from "@/lib/email/important-date-reminder";
import {
  importantDateReminderSubject,
  runImportantDateReminders,
} from "@/lib/jobs/important-date-reminders";
import { pruneExpiredTokens } from "@/lib/jobs/important-date-reminders/state";
import type { UpcomingImportantDate } from "@/lib/repo/reminders";

/**
 * Birthday/anniversary reminders are the easiest job in the product to turn into
 * spam: the cron runs daily and an item sits in the lead window for a week, so a
 * naive sweep emails the same birthday seven times. These cases pin the three
 * product rules that stop that — opt-in gating, the "nothing to say ⇒ no email"
 * guard, and the once-per-(occurrence, stage) send rule — plus the escaping that
 * keeps imported contact names out of the HTML.
 *
 * vi.mock is hoisted above these imports, so every mock handle is `mock`-prefixed
 * to be hoisted with it.
 */

const mockSendEmail = vi.fn();
vi.mock("@/lib/email/send", () => ({
  emailEnabled: () => true,
  ownerEmail: () => "owner@example.com",
  sendEmail: (input: { to: string; subject: string; html: string }) => mockSendEmail(input),
  // Identity shell: the wrapper chrome is not what these cases are about.
  emailShell: (_title: string, body: string) => body,
}));

// Self-host shape (hostedTenants → null): one sweep for the owner, no RLS scope,
// which keeps the fan-out loop out of these cases. The hosted loop is the same
// sweepUser, only wrapped in withUserDb.
vi.mock("@/lib/hosted/tenants", () => ({
  hostedTenants: async () => null,
  runOnGlobal: <T>(work: () => Promise<T>) => work(),
}));

// Not exercised on the self-host path, but statically imported by the job.
vi.mock("@/lib/db/request-scope", () => ({
  withUserDb: async <T>(_userId: string, work: () => Promise<T>) => work(),
}));

const mockEnabled = vi.fn();
vi.mock("@/lib/repo/suggestion-settings", () => ({
  getImportantDateRemindersEnabled: () => mockEnabled(),
  getImportantDateLeadDays: async () => 7,
}));

const mockUpcoming = vi.fn();
vi.mock("@/lib/repo/reminders", () => ({
  listUpcomingImportantDates: () => mockUpcoming(),
}));

/**
 * In-memory settings row — the REAL send-state code (state.ts) runs against it,
 * so the suppression assertions below exercise token building, persistence and
 * pruning rather than a stubbed "already sent" answer.
 */
const settingsStore = new Map<string, string>();
vi.mock("@/lib/repo/settings", () => ({
  getSetting: async (key: string) => settingsStore.get(key) ?? null,
  setSetting: async (key: string, value: string) => {
    settingsStore.set(key, value);
  },
}));

/** Occurrence dates must be relative to the real today: pruning compares to it. */
const TODAY = new Date();
function isoDate(daysFromToday: number): string {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function birthday(daysUntil: number): UpcomingImportantDate {
  return {
    contactId: "c1",
    contactName: "Ada Lovelace",
    label: "Birthday",
    value: "1990-03-14",
    date: isoDate(daysUntil), // the ANNUAL OCCURRENCE — stable as daysUntil counts down
    daysUntil,
    turning: 36,
  };
}

describe("runImportantDateReminders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    settingsStore.clear();
    mockSendEmail.mockResolvedValue({ ok: true });
    mockEnabled.mockResolvedValue(true);
  });

  it("sends nothing when the user has not opted in — reminders are off by default", async () => {
    // Important dates arrive in bulk from address-book imports the user never
    // reviewed; emailing them unasked would be us deciding to watch that data.
    mockEnabled.mockResolvedValue(false);
    mockUpcoming.mockResolvedValue([birthday(3)]);

    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when no date is coming up — an empty digest is pure noise", async () => {
    mockUpcoming.mockResolvedValue([]);

    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails a birthday once when it enters the window, stays silent the next day, then nudges on the day itself", async () => {
    // THE ANTI-SPAM RULE. Without it the daily cron would email this one
    // birthday on all eight days of a 7-day lead window. The send token keys on
    // the OCCURRENCE date + stage, not on daysUntil, which is what makes the
    // following day a no-op while still allowing the day-of nudge.
    const occurrence = isoDate(7);

    mockUpcoming.mockResolvedValue([{ ...birthday(7), date: occurrence }]);
    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    // Same run again (a re-triggered cron) — and again tomorrow, 6 days out.
    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 0, skipped: null });
    mockUpcoming.mockResolvedValue([{ ...birthday(6), date: occurrence }]);
    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    // The day itself is the second (and last) send for this occurrence.
    mockUpcoming.mockResolvedValue([{ ...birthday(0), date: occurrence }]);
    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("marks nothing as sent when Resend fails, so the reminder is not silently lost", async () => {
    mockUpcoming.mockResolvedValue([birthday(2)]);
    mockSendEmail.mockResolvedValue({ ok: false, error: "rate limited" });

    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 0, skipped: null });

    mockSendEmail.mockResolvedValue({ ok: true });
    await expect(runImportantDateReminders()).resolves.toEqual({ sent: 1, skipped: null });
  });
});

describe("importantDateReminderSubject", () => {
  it("is singular for one date", () => {
    expect(importantDateReminderSubject(1)).toBe("1 important date coming up");
  });

  it("pluralises for several, and names no contact — subject lines show on lock screens", () => {
    expect(importantDateReminderSubject(3)).toBe("3 important dates coming up");
  });
});

describe("pruneExpiredTokens", () => {
  it("drops tokens for occurrences that have passed so the settings row cannot grow forever", () => {
    // Next year's birthday is a different occurrence (the date is in the token),
    // so last week's token can never suppress it and must not be kept.
    const past = JSON.stringify(["c1", "Birthday", "2026-01-01", "day-of"]);
    const future = JSON.stringify(["c1", "Birthday", "2026-12-25", "lead"]);
    expect(pruneExpiredTokens([past, future], "2026-07-30")).toEqual([future]);
  });

  it("drops unparseable tokens rather than trusting them to suppress a send", () => {
    expect(pruneExpiredTokens(["not json"], "2026-07-30")).toEqual([]);
  });
});

describe("importantDateReminderHtml", () => {
  const opts = { appUrl: "https://app.example/app/calendar" };

  it("says when, in words the reader can act on", () => {
    expect(importantDateReminderHtml([birthday(0)], opts)).toContain("today");
    expect(importantDateReminderHtml([birthday(1)], opts)).toContain("tomorrow");
    expect(importantDateReminderHtml([birthday(3)], opts)).toContain("in 3 days");
  });

  it("says 'turning 36' for a birthday but '36 years' for an anniversary", () => {
    expect(importantDateReminderHtml([birthday(1)], opts)).toContain("turning 36");
    const anniversary = { ...birthday(1), label: "Wedding anniversary" };
    const html = importantDateReminderHtml([anniversary], opts);
    expect(html).toContain("36 years");
    expect(html).not.toContain("turning");
  });

  it("omits the age entirely when the stored date carried no year", () => {
    const html = importantDateReminderHtml([{ ...birthday(1), turning: null }], opts);
    expect(html).not.toContain("turning");
  });

  it("HTML-escapes imported contact names and labels so address-book data can't inject markup", () => {
    const html = importantDateReminderHtml(
      [
        {
          ...birthday(2),
          contactName: "Ada & <script>alert(1)</script>",
          label: "Birthday <b>",
        },
      ],
      opts,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ada &amp; &lt;script&gt;");
    expect(html).toContain("birthday &lt;b&gt;");
  });
});
