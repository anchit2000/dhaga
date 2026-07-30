import { beforeEach, describe, expect, it, vi } from "vitest";
import { dailyDigestSubject, runDailyDigest } from "@/lib/jobs/daily-digest";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";

/**
 * Same regression as morning-reminder.test.ts (read that file's header for the
 * failure mode): the reach-out digest read `daily_digest_enabled` on an UNSCOPED
 * connection, which under EE's RLS matches zero rows — so every hosted tenant
 * looked opted-out and this digest could never send. The fake settings store here
 * only returns rows inside a tenant scope, so the old implementation fails these
 * cases rather than passing them by accident.
 */

const mockEmailEnabled = vi.fn<() => boolean>();
const mockSendEmail = vi.fn();
vi.mock("@/lib/email/send", () => ({
  emailEnabled: () => mockEmailEnabled(),
  ownerEmail: () => "owner@example.com",
  sendEmail: (input: { to: string; subject: string; html: string }) => mockSendEmail(input),
  emailShell: (_title: string, body: string) => body,
}));

const mockTenants = vi.fn();
vi.mock("@/lib/hosted/tenants", () => ({
  hostedTenants: () => mockTenants(),
  runOnGlobal: <T>(work: () => Promise<T>) => work(),
}));

let currentUserId: string | null = null;
vi.mock("@/lib/db/request-scope", () => ({
  withUserDb: async <T>(userId: string, work: () => Promise<T>): Promise<T> => {
    const previous = currentUserId;
    currentUserId = userId;
    try {
      return await work();
    } finally {
      currentUserId = previous;
    }
  },
}));

const settingsRows = new Map<string, string>();
let unscopedReads = 0;
vi.mock("@/lib/repo/settings", () => ({
  getSetting: async (key: string): Promise<string | null> => {
    if (currentUserId === null) {
      unscopedReads++; // RLS: an unscoped read sees nothing — the production bug
      return null;
    }
    return settingsRows.get(`${currentUserId}:${key}`) ?? null;
  },
  setSetting: async (key: string, value: string): Promise<void> => {
    if (currentUserId === null) throw new Error("settings write outside a tenant scope");
    settingsRows.set(`${currentUserId}:${key}`, value);
  },
}));

const mockHasCalendar = vi.fn();
const mockFreeBusy = vi.fn();
vi.mock("@/lib/repo/calendar", () => ({
  hasCalendarConnection: () => mockHasCalendar(),
  getFreeBusy: () => mockFreeBusy(),
}));

const mockBuildSuggestions = vi.fn();
vi.mock("@/lib/repo/daily-suggestions", () => ({
  buildDailySuggestions: () => mockBuildSuggestions(),
}));

vi.mock("@/lib/actions/resilience", () => ({ logActionError: () => {} }));

/** Storage keys as literals: the on-disk contract a deployed instance already has. */
const OPT_IN_KEY = "daily_digest_enabled";
const SCHEDULE_PREFS_KEY = "schedule_prefs";
const LAST_RUN_KEY = "daily_digest_last_local_day";

/** UTC+14 year-round: a tenant whose local day is reliably not the UTC day. */
const KIRITIMATI = "Pacific/Kiritimati";

function optIn(userId: string): void {
  settingsRows.set(`${userId}:${OPT_IN_KEY}`, "on");
  settingsRows.set(`${userId}:${SCHEDULE_PREFS_KEY}`, JSON.stringify({ timezone: KIRITIMATI }));
}

function suggestion(): DailySuggestion {
  return {
    contactId: "c1",
    name: "Ada Lovelace",
    title: "Engineer",
    companyName: "Analytical Ltd",
    bucket: "cadence",
    reason: "Monthly · due to reconnect",
    everyDays: 30,
    lastTouch: null,
  };
}

// 2026-07-30T20:00Z = 2026-07-31 10:00 in Kiritimati; the second run is a new UTC
// day but the SAME Kiritimati day.
const RUN_1 = new Date("2026-07-30T20:00:00Z");
const RUN_2_SAME_LOCAL_DAY = new Date("2026-07-31T02:00:00Z");

describe("runDailyDigest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    settingsRows.clear();
    unscopedReads = 0;
    currentUserId = null;
    mockEmailEnabled.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ ok: true });
    mockHasCalendar.mockResolvedValue(false);
    mockFreeBusy.mockResolvedValue([]);
    mockBuildSuggestions.mockResolvedValue({ suggestions: [suggestion()], count: 5 });
    mockTenants.mockResolvedValue([{ id: "u1", email: "one@example.com" }]);
  });

  it("emails a hosted tenant who opted in, reading that tenant's settings INSIDE its own scope", async () => {
    // The bug fix: unscoped, the opt-in read returned no row and every hosted
    // tenant was silently treated as opted out.
    optIn("u1");

    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail.mock.calls[0][0].to).toBe("one@example.com");
    expect(unscopedReads).toBe(0);
  });

  it("honours each tenant's own opt-in and skips the ones who never asked for it", async () => {
    mockTenants.mockResolvedValue([
      { id: "u1", email: "one@example.com" },
      { id: "u2", email: "two@example.com" },
    ]);
    optIn("u2");

    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("two@example.com");
  });

  it("emails at most once per tenant per THEIR local day", async () => {
    // RUN_2 is a later UTC day but the same local day, so a UTC-keyed record (or
    // none at all) would send this tenant a duplicate.
    optIn("u1");

    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(settingsRows.get(`u1:${LAST_RUN_KEY}`)).toBe(JSON.stringify("2026-07-31"));
    await expect(runDailyDigest(RUN_2_SAME_LOCAL_DAY)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when there is nobody to suggest — an empty digest is pure noise", async () => {
    optIn("u1");
    mockBuildSuggestions.mockResolvedValue({ suggestions: [], count: 5 });

    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not touch the calendar provider for a tenant with no calendar connected", async () => {
    // getFreeBusy is the one unit that talks to Google from inside the tenant's DB
    // scope; not calling it for the tenants that cannot use it keeps that hold off
    // the common path.
    optIn("u1");

    await runDailyDigest(RUN_1);
    expect(mockFreeBusy).not.toHaveBeenCalled();
  });

  it("sends nothing when the tenant has not opted in — the digest is off by default", async () => {
    settingsRows.set(`u1:${SCHEDULE_PREFS_KEY}`, JSON.stringify({ timezone: KIRITIMATI }));

    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("is a clean no-op without email configured — it must not even enumerate tenants", async () => {
    mockEmailEnabled.mockReturnValue(false);

    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: "no_email" });
    expect(mockTenants).not.toHaveBeenCalled();
  });

  it("does not send on the wrong local hour once the hourly gate is switched on", async () => {
    optIn("u1");
    vi.stubEnv("EMAIL_JOBS_HOURLY", "true");

    // 20:00Z is 10:00 in Kiritimati, not the 08:00 target.
    await expect(runDailyDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    // 18:00Z is 08:00 the next day there.
    await expect(runDailyDigest(new Date("2026-07-30T18:00:00Z"))).resolves.toEqual({
      sent: 1,
      skipped: null,
    });
  });
});

describe("dailyDigestSubject", () => {
  it("is singular for one person", () => {
    expect(dailyDigestSubject(1)).toBe("1 person to reach out to today");
  });

  it("pluralises, and names nobody — subject lines show on lock screens", () => {
    expect(dailyDigestSubject(4)).toBe("4 people to reach out to today");
  });
});
