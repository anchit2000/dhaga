import { describe, expect, it } from "vitest";
import { formatDate, formatWeekdayTime } from "@/utils/format-date";

/**
 * Client components render once on the server (server's locale) and once
 * more in the browser during hydration (the user's locale). If either
 * helper delegated to the runtime locale, that mismatch would reintroduce
 * the React #418 hydration bug this helper exists to prevent — so pin the
 * exact output rather than just checking it "looks like a date".
 */
describe("formatDate", () => {
  it("renders a fixed 'D MMM YYYY' shape regardless of runtime locale", () => {
    // Noon UTC keeps the local calendar day stable across realistic CI/dev
    // timezones, so this only pins the *shape* (day-month-year, short month,
    // no comma) — an en-US render ("Jul 16, 2026") would fail this.
    expect(formatDate(new Date("2026-07-16T12:00:00Z"))).toBe("16 Jul 2026");
  });
});

describe("formatWeekdayTime", () => {
  it("renders a fixed 'Weekday HH:MM' shape regardless of runtime locale", () => {
    // Hour/minute are inherently local-timezone-dependent (that's the point
    // of a meeting-slot time), so derive the expected clock reading from
    // the same Date instance rather than hardcoding a machine-specific
    // wall-clock time — this still pins the *shape* (short weekday, 24h
    // clock, zero-padded minute, single space) that must not vary with
    // locale. An en-US render ("Thu, 8:00 PM") would fail this.
    const date = new Date("2026-07-16T14:30:00Z");
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    expect(formatWeekdayTime(date)).toBe(`${weekday} ${hh}:${mm}`);
  });
});
