import { describe, expect, it } from "vitest";
import { todayLine } from "./today";

/**
 * `todayLine` is how every extraction/draft prompt learns what "next Tuesday",
 * "last week" and "in 3 days" resolve to. Two things must hold, and neither is
 * about formatting:
 *  - the line must carry the day the CALLER resolved (the user's, from their
 *    stored zone). A user in UTC-7 writing "follow up next Tuesday" at 18:00
 *    local is already on the next UTC day, so a UTC "today" makes the model
 *    resolve every relative date one day late — a wrong due date, silently.
 *  - omitting the argument must keep the exact previous output (the UTC day), or
 *    the ~9 prompts that don't pass one would shift meaning by a day.
 */
describe("todayLine", () => {
  it("reflects the calendar day it is given, not the host's", () => {
    expect(todayLine({ year: 2026, month: 7, day: 29 })).toBe("Today's date: 2026-07-29");
  });

  it("zero-pads, so the model never sees 2026-7-5", () => {
    expect(todayLine({ year: 2026, month: 7, day: 5 })).toBe("Today's date: 2026-07-05");
  });

  it("distinguishes two zones' days for the same instant — the point of the parameter", () => {
    // 2026-07-30T02:00Z: still 29 July in America/Los_Angeles, already 30 July
    // in UTC. Both lines must be producible, or the west-of-UTC user's prompt
    // cannot be made correct.
    expect(todayLine({ year: 2026, month: 7, day: 29 })).not.toBe(
      todayLine({ year: 2026, month: 7, day: 30 }),
    );
  });

  it("falls back to the UTC day when no day is passed — byte-identical to before", () => {
    // Deliberately compares against toISOString(), the previous implementation:
    // any drift (e.g. quietly switching to the host's local day) breaks this on
    // every machine whose zone is not UTC.
    expect(todayLine()).toBe(`Today's date: ${new Date().toISOString().slice(0, 10)}`);
  });
});
