import { describe, expect, it, vi } from "vitest";
import { getSchedulePrefs, setSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { setSetting } from "@/lib/repo/settings";
import { setTimezoneAction } from "@/lib/actions/suggestions";

// Same stubs the sibling suggestion-settings action test uses: the session gate
// and revalidatePath aren't under test, the settings round-trip through the real
// repo (in-memory PGlite) is.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null, // request-scope falls back to the default (unscoped) db
  requireUserId: async () => "test-user",
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

const SCHEDULE_PREFS_KEY = "schedule_prefs";

/**
 * `timezone` is a new field inside a JSON blob that predates it, so the read path
 * has to survive both an old row without it and a row whose value is no longer a
 * zone (hand-edited, or retired by a tzdata update). Both must come back as UTC —
 * the pre-timezone behaviour — instead of handing a bad id to `Intl` inside a cron.
 */
describe("getSchedulePrefs timezone parsing", () => {
  it("defaults to UTC for stored JSON written before the field existed", async () => {
    await setSetting(
      SCHEDULE_PREFS_KEY,
      JSON.stringify({ startHour: 9, endHour: 17, overloadThreshold: 5, utcOffsetMinutes: 330 }),
    );
    const prefs = await getSchedulePrefs();
    expect(prefs.timezone).toBe("UTC");
    // The fields that were already there must survive untouched — adding one is
    // not a licence to rewrite the blob.
    expect(prefs.utcOffsetMinutes).toBe(330);
    expect(prefs.startHour).toBe(9);
  });

  it("falls back to UTC for a stored value that is not a zone", async () => {
    await setSetting(
      SCHEDULE_PREFS_KEY,
      JSON.stringify({ startHour: 9, endHour: 17, overloadThreshold: 5, timezone: "Mars/Base" }),
    );
    expect((await getSchedulePrefs()).timezone).toBe("UTC");
  });

  it("round-trips a real zone", async () => {
    await setSchedulePrefs({
      startHour: 9,
      endHour: 17,
      overloadThreshold: 5,
      utcOffsetMinutes: 330,
      timezone: "Asia/Kolkata",
    });
    expect((await getSchedulePrefs()).timezone).toBe("Asia/Kolkata");
  });
});

/**
 * The action is the trust boundary. A bad POST must not reset a zone the user
 * deliberately chose: silently moving someone from Asia/Kolkata to UTC shifts
 * every reminder by 5.5 hours with nothing in the UI to explain it.
 */
describe("setTimezoneAction", () => {
  it("saves a valid zone", async () => {
    const fd = new FormData();
    fd.set("timezone", "Europe/London");
    await setTimezoneAction(fd);
    expect((await getSchedulePrefs()).timezone).toBe("Europe/London");
  });

  it("keeps the stored zone when the posted one is unknown or missing", async () => {
    const good = new FormData();
    good.set("timezone", "Asia/Kolkata");
    await setTimezoneAction(good);

    const bad = new FormData();
    bad.set("timezone", "Nowhere/Nothing");
    await setTimezoneAction(bad);
    expect((await getSchedulePrefs()).timezone).toBe("Asia/Kolkata");

    await setTimezoneAction(new FormData());
    expect((await getSchedulePrefs()).timezone).toBe("Asia/Kolkata");
  });

  it("leaves the working-hour window alone", async () => {
    // Why this action exists instead of a field on setSuggestionSettingsAction:
    // that one rebuilds the whole blob from its form, so a timezone-only submit
    // would flatten these three numbers back to the code defaults.
    await setSchedulePrefs({
      startHour: 6,
      endHour: 22,
      overloadThreshold: 3,
      utcOffsetMinutes: 330,
      timezone: "UTC",
    });
    const fd = new FormData();
    fd.set("timezone", "Europe/London");
    await setTimezoneAction(fd);
    expect(await getSchedulePrefs()).toEqual({
      startHour: 6,
      endHour: 22,
      overloadThreshold: 3,
      utcOffsetMinutes: 330,
      timezone: "Europe/London",
    });
  });
});
