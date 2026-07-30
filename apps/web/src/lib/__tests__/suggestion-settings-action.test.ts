import { describe, expect, it, vi } from "vitest";
import { getImportantDateLeadDays, getSchedulePrefs } from "@/lib/repo/suggestion-settings";
import {
  setImportantDateLeadDaysAction,
  setSuggestionSettingsAction,
} from "@/lib/actions/suggestions";
import {
  IMPORTANT_DATE_LEAD_DAYS_DEFAULT,
  IMPORTANT_DATE_LEAD_DAYS_MAX,
  IMPORTANT_DATE_LEAD_DAYS_MIN,
} from "@/utils/constants/important-dates";

// The action gates on the session and calls revalidatePath; neither is under
// test here, so both are stubbed. The scheduling window itself round-trips
// through the real settings repo (in-memory PGlite) so the test exercises the
// exact parse the action ships.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null, // request-scope falls back to the default (unscoped) db
  requireUserId: async () => "test-user",
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

/**
 * A midnight working-day start (startHour = 0) is legitimate, but `Number(x)
 * || 9` treated the falsy 0 as "missing" and silently rewrote it to 9am —
 * then Math.max(endHour, startHour + 1) corrupted the window off that wrong
 * start. These tests pin that 0 survives, while a genuinely absent field
 * still falls back to the default, so the fix can't over-correct into
 * dropping the fallback entirely.
 */
describe("setSuggestionSettingsAction hour parsing", () => {
  it("preserves an explicit startHour of 0 instead of defaulting it to 9", async () => {
    await setSuggestionSettingsAction(form({ startHour: "0", endHour: "8" }));
    const prefs = await getSchedulePrefs();
    expect(prefs.startHour).toBe(0);
    expect(prefs.endHour).toBe(8); // Math.max(8, 0 + 1) — untouched by a real start
  });

  it("still falls back to the default start when the field is absent", async () => {
    await setSuggestionSettingsAction(form({ endHour: "17" }));
    const prefs = await getSchedulePrefs();
    expect(prefs.startHour).toBe(9);
  });
});

/**
 * The lead time decides how early a birthday reminder fires, so a wrong value is
 * a wrong email — early, late, or never. Three things have to hold: 0 means
 * "day-of only" and is a real choice the `Number(x) || default` idiom would eat;
 * a value the browser's number input never validated (it is only a hint — the
 * action is the boundary) must land on the documented default rather than NaN;
 * and a number past the ceiling has to come back as the ceiling, because a
 * reminder a year out is not a reminder.
 */
describe("setImportantDateLeadDaysAction clamping", () => {
  it("keeps an explicit 0 — day-of only is a choice, not a missing field", async () => {
    await setImportantDateLeadDaysAction(form({ leadDays: "0" }));
    expect(await getImportantDateLeadDays()).toBe(IMPORTANT_DATE_LEAD_DAYS_MIN);
    expect(IMPORTANT_DATE_LEAD_DAYS_MIN).toBe(0);
  });

  it("falls back to the default when the field is absent or not a number", async () => {
    await setImportantDateLeadDaysAction(form({ leadDays: "0" }));
    await setImportantDateLeadDaysAction(form({ leadDays: "next week" }));
    expect(await getImportantDateLeadDays()).toBe(IMPORTANT_DATE_LEAD_DAYS_DEFAULT);

    await setImportantDateLeadDaysAction(form({ leadDays: "0" }));
    await setImportantDateLeadDaysAction(form({}));
    expect(await getImportantDateLeadDays()).toBe(IMPORTANT_DATE_LEAD_DAYS_DEFAULT);
  });

  it("clamps above the maximum down to the ceiling, and below zero up to it", async () => {
    await setImportantDateLeadDaysAction(form({ leadDays: "365" }));
    expect(await getImportantDateLeadDays()).toBe(IMPORTANT_DATE_LEAD_DAYS_MAX);

    await setImportantDateLeadDaysAction(form({ leadDays: "-5" }));
    expect(await getImportantDateLeadDays()).toBe(IMPORTANT_DATE_LEAD_DAYS_MIN);
  });
});
