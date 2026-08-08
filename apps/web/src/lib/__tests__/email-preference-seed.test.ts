import { describe, expect, it, vi } from "vitest";
import {
  getImportantDateRemindersEnabled,
  isConfirmationsDigestEnabled,
  isDailyDigestEnabled,
  isJobEmailNotificationsEnabled,
  isMorningReminderEnabled,
  seedEmailPreferences,
  setConfirmationsDigestEnabled,
} from "@/lib/repo/suggestion-settings";

// Same stubs the other repo tests use: getCurrentUser=null makes request-scope
// fall back to the unscoped in-memory PGlite, so the upserts round-trip for real.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
}));

async function readAll(): Promise<Record<string, boolean>> {
  return {
    daily: await isDailyDigestEnabled(),
    confirmations: await isConfirmationsDigestEnabled(),
    morning: await isMorningReminderEnabled(),
    importantDates: await getImportantDateRemindersEnabled(),
    jobs: await isJobEmailNotificationsEnabled(),
  };
}

describe("email preference seed", () => {
  it("leaves an un-seeded account silent, and switches a seeded one on", async () => {
    // The floor that stops this change reaching backwards: existing accounts
    // have no rows, and a missing row must keep meaning "do not email me".
    // If this ever flips, shipping the seed starts mailing every user who
    // never asked to be mailed.
    expect(await readAll()).toEqual({
      daily: false,
      confirmations: false,
      morning: false,
      importantDates: false,
      jobs: false,
    });

    await seedEmailPreferences();

    expect(await readAll()).toEqual({
      daily: true,
      confirmations: true,
      morning: true,
      importantDates: true,
      jobs: true,
    });
  });

  it("never overwrites a choice the user already made", async () => {
    // The seed is insert-if-absent, not an upsert. A retried signup hook — or a
    // later backfill over accounts that have been running for months — must not
    // silently re-enable a digest someone deliberately turned off.
    await setConfirmationsDigestEnabled(false);

    await seedEmailPreferences();

    expect(await isConfirmationsDigestEnabled()).toBe(false);
    expect(await isDailyDigestEnabled()).toBe(true);
  });
});
