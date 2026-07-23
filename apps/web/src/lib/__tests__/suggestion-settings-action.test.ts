import { describe, expect, it, vi } from "vitest";
import { getSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { setSuggestionSettingsAction } from "@/lib/actions/suggestions";

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
