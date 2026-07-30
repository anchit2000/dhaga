import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmationsDigestSubject, runConfirmationsDigest } from "@/lib/jobs/confirmations-digest";
import type { ConfirmationView } from "@/lib/repo/confirmations";

/**
 * Same regression as morning-reminder.test.ts (read that file's header for the
 * failure mode): the confirmations digest read `confirmations_digest_enabled` on
 * an UNSCOPED connection, which under EE's RLS matches zero rows — so every
 * hosted tenant looked opted-out and this digest could never send. The fake
 * settings store here only returns rows inside a tenant scope, so the old
 * implementation fails these cases rather than passing them by accident.
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

const mockPending = vi.fn();
vi.mock("@/lib/repo/confirmations", () => ({
  listPendingConfirmations: () => mockPending(),
}));

vi.mock("@/lib/actions/resilience", () => ({ logActionError: () => {} }));

/** Storage keys as literals: the on-disk contract a deployed instance already has. */
const OPT_IN_KEY = "confirmations_digest_enabled";
const SCHEDULE_PREFS_KEY = "schedule_prefs";
const LAST_RUN_KEY = "confirmations_digest_last_local_day";

/** UTC+14 year-round: a tenant whose local day is reliably not the UTC day. */
const KIRITIMATI = "Pacific/Kiritimati";

function optIn(userId: string): void {
  settingsRows.set(`${userId}:${OPT_IN_KEY}`, "on");
  settingsRows.set(`${userId}:${SCHEDULE_PREFS_KEY}`, JSON.stringify({ timezone: KIRITIMATI }));
}

function pendingConfirmation(): ConfirmationView {
  return {
    id: "cf1",
    type: "note_subject",
    payload: {
      type: "note_subject",
      question: "Who is this note about?",
      options: [],
      apply: { kind: "attach_note", noteBody: "Met at the summit", subjectName: "Ada" },
    },
    contactId: null,
    contactName: null,
    sourceNoteId: null,
    createdAt: new Date("2026-07-29T10:00:00Z"),
  };
}

// 2026-07-30T20:00Z = 2026-07-31 10:00 in Kiritimati; the second run is a new UTC
// day but the SAME Kiritimati day.
const RUN_1 = new Date("2026-07-30T20:00:00Z");
const RUN_2_SAME_LOCAL_DAY = new Date("2026-07-31T02:00:00Z");

describe("runConfirmationsDigest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    settingsRows.clear();
    unscopedReads = 0;
    currentUserId = null;
    mockEmailEnabled.mockReturnValue(true);
    mockSendEmail.mockResolvedValue({ ok: true });
    mockPending.mockResolvedValue([pendingConfirmation()]);
    mockTenants.mockResolvedValue([{ id: "u1", email: "one@example.com" }]);
  });

  it("emails a hosted tenant who opted in, reading that tenant's settings INSIDE its own scope", async () => {
    // The bug fix: unscoped, the opt-in read returned no row and every hosted
    // tenant was silently treated as opted out.
    optIn("u1");

    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail.mock.calls[0][0].to).toBe("one@example.com");
    expect(unscopedReads).toBe(0);
  });

  it("honours each tenant's own opt-in and skips the ones who never asked for it", async () => {
    mockTenants.mockResolvedValue([
      { id: "u1", email: "one@example.com" },
      { id: "u2", email: "two@example.com" },
    ]);
    optIn("u2");

    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("two@example.com");
  });

  it("emails at most once per tenant per THEIR local day", async () => {
    // RUN_2 is a later UTC day but the same local day, so a UTC-keyed record (or
    // none at all) would send this tenant a duplicate.
    optIn("u1");

    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 1, skipped: null });
    expect(settingsRows.get(`u1:${LAST_RUN_KEY}`)).toBe(JSON.stringify("2026-07-31"));
    await expect(runConfirmationsDigest(RUN_2_SAME_LOCAL_DAY)).resolves.toEqual({
      sent: 0,
      skipped: null,
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the review inbox is empty", async () => {
    optIn("u1");
    mockPending.mockResolvedValue([]);

    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when the tenant has not opted in — the digest is off by default", async () => {
    settingsRows.set(`u1:${SCHEDULE_PREFS_KEY}`, JSON.stringify({ timezone: KIRITIMATI }));

    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("is a clean no-op without email configured — it must not even enumerate tenants", async () => {
    mockEmailEnabled.mockReturnValue(false);

    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: "no_email" });
    expect(mockTenants).not.toHaveBeenCalled();
  });

  it("does not send on the wrong local hour once the hourly gate is switched on", async () => {
    optIn("u1");
    vi.stubEnv("EMAIL_JOBS_HOURLY", "true");

    // 20:00Z is 10:00 in Kiritimati, not the 08:00 target.
    await expect(runConfirmationsDigest(RUN_1)).resolves.toEqual({ sent: 0, skipped: null });
    // 18:00Z is 08:00 the next day there.
    await expect(runConfirmationsDigest(new Date("2026-07-30T18:00:00Z"))).resolves.toEqual({
      sent: 1,
      skipped: null,
    });
  });
});

describe("confirmationsDigestSubject", () => {
  it("is singular for one confirmation", () => {
    expect(confirmationsDigestSubject(1)).toBe("1 confirmation to review");
  });

  it("pluralises, and quotes no question text — subject lines show on lock screens", () => {
    expect(confirmationsDigestSubject(5)).toBe("5 confirmations to review");
  });
});
