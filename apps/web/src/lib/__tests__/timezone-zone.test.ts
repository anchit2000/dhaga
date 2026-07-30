import { describe, expect, it } from "vitest";
import {
  coerceTimeZone,
  isLocalHour,
  isValidTimeZone,
  localDayKey,
  supportedTimeZones,
  zonedParts,
} from "@/lib/time/zone";

/**
 * `zone.ts` is the primitive the reminder jobs will trust to answer "is it that
 * user's morning yet?" and "have we already sent today?". Every case below is a
 * wrong-email bug if it breaks: a day boundary read in the wrong zone fires a
 * birthday reminder a day early, and a fixed offset gets the hour wrong for half
 * the year — which is the whole reason this module exists instead of arithmetic
 * on the stored `utcOffsetMinutes`.
 *
 * Pure `Intl`, no DB: kept in its own file so it doesn't pay the PGlite cold
 * start the sibling settings test needs.
 */
describe("localDayKey", () => {
  it("puts one instant on different calendar days either side of a UTC offset", () => {
    // 2026-03-10T04:30:00Z — already the 10th in UTC, still the 9th in
    // California (UTC-7 on that date). A job keyed on the UTC day would treat
    // these as one day and skip the user's real "today".
    const instant = new Date("2026-03-10T04:30:00Z");
    expect(localDayKey(instant, "UTC")).toBe("2026-03-10");
    expect(localDayKey(instant, "America/Los_Angeles")).toBe("2026-03-09");
  });

  it("crosses forward for zones ahead of UTC", () => {
    // 20:00Z is already tomorrow in Kolkata (UTC+5:30).
    const instant = new Date("2026-03-09T20:00:00Z");
    expect(localDayKey(instant, "UTC")).toBe("2026-03-09");
    expect(localDayKey(instant, "Asia/Kolkata")).toBe("2026-03-10");
  });
});

describe("zonedParts DST handling", () => {
  it("gives a different local hour for the same UTC hour in January vs July", () => {
    // 16:00Z is 08:00 in Los Angeles under PST (Jan, UTC-8) but 09:00 under PDT
    // (Jul, UTC-7). A stored offset can only ever be right about one of these, so
    // "email me at 8am" would silently drift to 9am for half the year.
    const winter = zonedParts(new Date("2026-01-15T16:00:00Z"), "America/Los_Angeles");
    const summer = zonedParts(new Date("2026-07-15T16:00:00Z"), "America/Los_Angeles");
    expect(winter.hour).toBe(8);
    expect(summer.hour).toBe(9);
  });

  it("reports midnight as hour 0, never 24", () => {
    // hourCycle h23: some ICU builds render midnight as "24" under hour12:false,
    // which would make `isLocalHour(date, tz, 0)` permanently false.
    expect(zonedParts(new Date("2026-01-15T00:00:00Z"), "UTC").hour).toBe(0);
  });

  it("returns 1-based months, matching the day key rather than Date.getMonth()", () => {
    expect(zonedParts(new Date("2026-01-15T12:00:00Z"), "UTC").month).toBe(1);
  });
});

describe("invalid zones fail safe", () => {
  it("treats an unknown zone as UTC instead of throwing", () => {
    // A corrupt stored zone reaches this module inside a cron looping over every
    // user; a RangeError there kills the whole run, so the contract is "degrade
    // to UTC", not "throw".
    const instant = new Date("2026-03-10T04:30:00Z");
    expect(() => localDayKey(instant, "Mars/Olympus_Mons")).not.toThrow();
    expect(localDayKey(instant, "Mars/Olympus_Mons")).toBe(localDayKey(instant, "UTC"));
    expect(zonedParts(instant, "")).toEqual(zonedParts(instant, "UTC"));
    expect(isLocalHour(instant, "Mars/Olympus_Mons", 4)).toBe(true); // 04:30 UTC
  });

  it("still reports the zone as invalid so callers can reject it", () => {
    // Failing safe must not mean failing silently: the settings read and the
    // action both need to be able to tell a bad zone from a good one.
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });
});

describe("coerceTimeZone", () => {
  it("honours the caller's fallback so a bad input can't reset a chosen zone", () => {
    // The action passes the zone already on record: a malformed POST should be a
    // no-op, not a silent move to UTC that shifts every reminder by hours.
    expect(coerceTimeZone("Nowhere/Nothing", "Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(coerceTimeZone(undefined, "Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(coerceTimeZone(330, "Asia/Kolkata")).toBe("Asia/Kolkata"); // an offset is not a zone
    expect(coerceTimeZone("Europe/London", "Asia/Kolkata")).toBe("Europe/London");
    expect(coerceTimeZone("Nowhere/Nothing")).toBe("UTC"); // default fallback
  });
});

describe("isLocalHour", () => {
  it("is true only for the matching local hour in that zone", () => {
    // 02:30Z = 08:00 in Kolkata (UTC+5:30). The half-hour offset also pins that
    // we read the zone's wall-clock hour rather than rounding a whole-hour offset.
    const instant = new Date("2026-03-10T02:30:00Z");
    expect(isLocalHour(instant, "Asia/Kolkata", 8)).toBe(true);
    expect(isLocalHour(instant, "Asia/Kolkata", 7)).toBe(false);
    expect(isLocalHour(instant, "Asia/Kolkata", 9)).toBe(false);
    expect(isLocalHour(instant, "UTC", 2)).toBe(true);
  });
});

describe("supportedTimeZones", () => {
  it("offers the real IANA list the picker renders", () => {
    const zones = supportedTimeZones();
    expect(zones.length).toBeGreaterThan(300);
    expect(zones).toContain("America/New_York");
    expect(zones.every((zone) => isValidTimeZone(zone))).toBe(true);
  });
});
