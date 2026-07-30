import { beforeEach, describe, expect, it, vi } from "vitest";
import { morningReminderSubject, runMorningReminder } from "@/lib/jobs/morning-reminder";

/**
 * THE REGRESSION THIS FILE EXISTS FOR: the morning reminder used to read its
 * opt-in setting on an UNSCOPED connection. Under `packages/ee`'s RLS every
 * tenant table is filtered by `app.current_user_id`, which an unscoped connection
 * never sets — so the `settings` read matched ZERO rows,
 * `isMorningReminderEnabled()` answered `false`, and a hosted user who ticked the
 * toggle could never receive this email at all.
 *
 * The harness below reproduces exactly that failure mode instead of asserting on
 * an implementation detail: the fake settings store returns rows ONLY while a
 * tenant scope is active (`withUserDb`), and counts every read that arrives
 * unscoped. The old implementation makes `sent: 0` and `unscopedReads > 0`; the
 * fixed one makes `sent: 1` and `unscopedReads: 0`.
 *
 * The REAL `repo/suggestion-settings` and `jobs/last-run` modules run on top of
 * that store, so the opt-in read, the schedule/timezone read and the local-day
 * send record are all exercised for real rather than stubbed.
 *
 * `vi.mock` is hoisted above these imports, so every mock handle is `mock`-prefixed
 * and only ever dereferenced inside a function body (never at factory-eval time).
 */

const mockEmailEnabled = vi.fn<() => boolean>();
const mockSendEmail = vi.fn();
vi.mock("@/lib/email/send", () => ({
  emailEnabled: () => mockEmailEnabled(),
  ownerEmail: () => "owner@example.com",
  sendEmail: (input: { to: string; subject: string; html: string }) => mockSendEmail(input),
  // Identity shell: the wrapper chrome is not what these cases are about.
  emailShell: (_title: string, body: string) => body,
}));

const mockTenants = vi.fn();
vi.mock("@/lib/hosted/tenants", () => ({
  hostedTenants: () => mockTenants(),
  runOnGlobal: <T>(work: () => Promise<T>) => work(),
}));

/**
 * The tenant scope, modelled the way RLS actually behaves: reads see this
 * tenant's rows and nothing else, and OUTSIDE a scope they see nothing.
 */
let currentUserId: string | null = null;
const scopesEntered: string[] = [];
vi.mock("@/lib/db/request-scope", () => ({
  withUserDb: async <T>(userId: string, work: () => Promise<T>): Promise<T> => {
    scopesEntered.push(userId);
    const previous = currentUserId;
    currentUserId = userId;
    try {
      return await work();
    } finally {
      currentUserId = previous;
    }
  },
}));

/** `${userId}:${key}` → value. Per-tenant, exactly like settings' (user_id, key) PK. */
const settingsRows = new Map<string, string>();
let unscopedReads = 0;
vi.mock("@/lib/repo/settings", () => ({
  getSetting: async (key: string): Promise<string | null> => {
    if (currentUserId === null) {
      // An unscoped connection under RLS matches no rows. Counting instead of
      // throwing keeps the failure shaped like the production bug: silent `false`.
      unscopedReads++;
      return null;
    }
    return settingsRows.get(`${currentUserId}:${key}`) ?? null;
  },
  setSetting: async (key: string, value: string): Promise<void> => {
    if (currentUserId === null) throw new Error("settings write outside a tenant scope");
    settingsRows.set(`${currentUserId}:${key}`, value);
  },
}));

const mockPendingSummary = vi.fn();
vi.mock("@/lib/repo/reminders", () => ({
  getPendingReminderSummary: () => mockPendingSummary(),
}));

const mockLogActionError = vi.fn();
vi.mock("@/lib/actions/resilience", () => ({
  logActionError: (name: string, error: unknown) => mockLogActionError(name, error),
}));

/**
 * Storage keys written as literals on purpose: they are the on-disk contract a
 * deployed instance already has rows under, so a rename has to be a deliberate,
 * visible change (and a migration decision), not a silent refactor.
 */
const OPT_IN_KEY = "morning_reminder_enabled";
const SCHEDULE_PREFS_KEY = "schedule_prefs";
const LAST_RUN_KEY = "morning_reminder_last_local_day";

/** UTC+14 year-round: a tenant whose local day is reliably NOT the UTC day. */
const KIRITIMATI = "Pacific/Kiritimati";

function optIn(userId: string, timezone = KIRITIMATI): void {
  settingsRows.set(`${userId}:${OPT_IN_KEY}`, "on");
  settingsRows.set(`${userId}:${SCHEDULE_PREFS_KEY}`, JSON.stringify({ timezone }));
}

// 2026-07-30T20:00Z is 2026-07-31 10:00 in Kiritimati.
const RUN_1 = new Date("2026-07-30T20:00:00Z");
// A LATER UTC DAY (07-31) that is still the SAME Kiritimati day (07-31).
const RUN_2_SAME_LOCAL_DAY = new Date("2026-07-31T02:00:00Z");
// 2026-08-01 01:00 in Kiritimati — the tenant's next local day.
const RUN_3_NEXT_LOCAL_DAY = new Date("2026-07-31T11:00:00Z");

describe("runMorningReminder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    settingsRows.clear();
    scopesEntered.length = 0;
    unscopedReads = 0;
    currentUserId = null;
    mockEmailEnabled.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ ok: true });
    mockPendingSummary.mockResolvedValue({ openFollowUps: 2, dueReachOuts: 1 });
    mockTenants.mockResolvedValue([{ id: "u1", email: "one@example.com" }]);
  });

  it("emails a hosted tenant who opted in, reading that tenant's settings INSIDE its own scope", async () => {
    // This is the bug fix. Before the per-tenant fan-out the opt-in read ran
    // unscoped, matched no rows under RLS, and this tenant was silently treated
    // as opted out — so this email could never send for any hosted user.
    optIn("u1");

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("one@example.com");
    expect(scopesEntered).toContain("u1");
    // Nothing may be read off a connection with no tenant set — that read is the
    // one that returns zero rows in production.
    expect(unscopedReads).toBe(0);
  });

  it("honours each tenant's OWN opt-in — one tenant's setting never speaks for another", async () => {
    mockTenants.mockResolvedValue([
      { id: "u1", email: "one@example.com" },
      { id: "u2", email: "two@example.com" },
    ]);
    optIn("u2"); // u1 left off

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("two@example.com");
  });

  it("sends nothing when the tenant has not opted in — this email is off by default", async () => {
    settingsRows.set(`u1:${SCHEDULE_PREFS_KEY}`, JSON.stringify({ timezone: KIRITIMATI }));

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails at most once per tenant per THEIR local day, and again on the next one", async () => {
    // The cron can be re-triggered, and a future hourly scheduler would call this
    // 24 times a day. The record is keyed on the recipient's local day, not on the
    // UTC day: RUN_2 is a new UTC day but the same day in Kiritimati, so a
    // UTC-keyed (or absent) record would send a duplicate here.
    optIn("u1");

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(settingsRows.get(`u1:${LAST_RUN_KEY}`)).toBe(JSON.stringify("2026-07-31"));

    await expect(runMorningReminder(RUN_2_SAME_LOCAL_DAY)).resolves.toEqual({
      sent: 0,
      skipped: null,
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    await expect(runMorningReminder(RUN_3_NEXT_LOCAL_DAY)).resolves.toEqual({
      sent: 1,
      skipped: null,
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    // Only the latest day is kept — the row cannot grow with every day it runs.
    expect(settingsRows.get(`u1:${LAST_RUN_KEY}`)).toBe(JSON.stringify("2026-08-01"));
  });

  it("marks nothing when Resend fails, so the reminder is retried rather than lost", async () => {
    optIn("u1");
    mockSendEmail.mockResolvedValue({ ok: false, error: "rate limited" });

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(settingsRows.get(`u1:${LAST_RUN_KEY}`)).toBeUndefined();

    mockSendEmail.mockResolvedValue({ ok: true });
    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
  });

  it("keeps sweeping later tenants when one tenant's read throws", async () => {
    // A single tenant's transient DB failure must not cost every tenant after it
    // in the loop their reminder — the fan-out is best-effort per tenant.
    mockTenants.mockResolvedValue([
      { id: "u1", email: "one@example.com" },
      { id: "u2", email: "two@example.com" },
    ]);
    optIn("u1");
    optIn("u2");
    mockPendingSummary.mockImplementation(async () => {
      if (currentUserId === "u1") throw new Error("connection terminated");
      return { openFollowUps: 1, dueReachOuts: 0 };
    });

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("two@example.com");
    expect(mockLogActionError).toHaveBeenCalledWith("morning-reminder", expect.any(Error));
  });

  it("sends nothing when the tenant has nothing pending — an empty nudge is noise", async () => {
    optIn("u1");
    mockPendingSummary.mockResolvedValue({ openFollowUps: 0, dueReachOuts: 0 });

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("is a clean no-op without email configured — it must not even enumerate tenants", async () => {
    mockEmailEnabled.mockReturnValue(false);

    await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 0, skipped: "no_email" });
    expect(mockTenants).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  describe("local-hour gate", () => {
    it("is OPT-IN: with no hourly flag the single daily cron run still sends", async () => {
      // Vercel Hobby allows one cron a day, at a fixed UTC hour that is 08:00 for
      // almost nobody. If the hour gate defaulted on, that one run would be
      // discarded for every tenant and NOBODY would ever be emailed.
      optIn("u1");

      await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    });

    it("when switched on, only the run at the tenant's own local 08:00 sends", async () => {
      optIn("u1");
      vi.stubEnv("EMAIL_JOBS_HOURLY", "true");

      // 20:00Z = 10:00 in Kiritimati — wrong hour for this tenant.
      await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
      expect(mockSendEmail).not.toHaveBeenCalled();

      // 18:00Z = 08:00 the next day in Kiritimati.
      await expect(runMorningReminder(new Date("2026-07-30T18:00:00Z"))).resolves.toEqual({
        sent: 1,
        skipped: null,
      });
    });

    it("still honours the original MORNING_REMINDER_HOURLY name for one release", async () => {
      // An existing deploy that set the old name must not silently start sending
      // at the wrong local hour just because the flag was generalised.
      optIn("u1");
      vi.stubEnv("MORNING_REMINDER_HOURLY", "true");

      await expect(runMorningReminder(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    });
  });
});

describe("morningReminderSubject", () => {
  it("is singular for one pending item", () => {
    expect(morningReminderSubject(1)).toBe("You have 1 reminder in Dhaga");
  });

  it("pluralises, and names no contact — subject lines show on lock screens", () => {
    expect(morningReminderSubject(3)).toBe("You have 3 reminders in Dhaga");
  });
});
