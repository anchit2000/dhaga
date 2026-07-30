import { describe, expect, it } from "vitest";
import {
  upcomingDateBadge,
  upcomingDateWindowLabel,
  upcomingDateYearsPhrase,
} from "../upcoming-date-copy";

/**
 * These pin the wording the user acts on. A birthday chip that says "tomorrow"
 * on the day itself, or an age of "turns 0" from a year-less import, is worse
 * than no reminder — the user posts the card late or greets the wrong person.
 */
describe("upcomingDateBadge", () => {
  it("still says today on the day itself — the reminder has to survive the morning", () => {
    expect(upcomingDateBadge(0)).toEqual({ label: "today", urgent: true });
  });

  it("names tomorrow instead of counting, so 'in 1 day' can never render", () => {
    expect(upcomingDateBadge(1)).toEqual({ label: "tomorrow", urgent: true });
  });

  it("counts calendar days from 2 onward, pluralised", () => {
    expect(upcomingDateBadge(2).label).toBe("in 2 days");
    expect(upcomingDateBadge(7).label).toBe("in 7 days");
  });

  it("keeps the accent for imminent dates only — the window can be 90 days wide", () => {
    expect(upcomingDateBadge(3).urgent).toBe(false);
    expect(upcomingDateBadge(90).urgent).toBe(false);
  });

  it("never renders a negative count, even though the repo should not produce one", () => {
    expect(upcomingDateBadge(-2).label).toBe("today");
  });
});

describe("upcomingDateYearsPhrase", () => {
  it("turns an age for a birthday but counts years for anything else", () => {
    expect(upcomingDateYearsPhrase("Birthday", 34)).toBe("turns 34");
    expect(upcomingDateYearsPhrase("Wedding anniversary", 12)).toBe("12 years");
  });

  it("matches the label case-insensitively — the label is free text from an import", () => {
    expect(upcomingDateYearsPhrase("birthday", 5)).toBe("turns 5");
  });

  it("singularises a first anniversary", () => {
    expect(upcomingDateYearsPhrase("Work anniversary", 1)).toBe("1 year");
  });

  it("says nothing when the stored value carried no year, so the row reads bare", () => {
    expect(upcomingDateYearsPhrase("Birthday", null)).toBeNull();
  });

  it("says nothing for a non-positive count rather than claiming 'turns 0'", () => {
    expect(upcomingDateYearsPhrase("Birthday", 0)).toBeNull();
    expect(upcomingDateYearsPhrase("Birthday", -1)).toBeNull();
  });
});

describe("upcomingDateWindowLabel", () => {
  it("explains the horizon so a date just outside it reads as a setting", () => {
    expect(upcomingDateWindowLabel(7)).toBe("next 7 days");
    expect(upcomingDateWindowLabel(1)).toBe("next 1 day");
  });

  it("stays sensible at the 0-day minimum instead of saying 'next 0 days'", () => {
    expect(upcomingDateWindowLabel(0)).toBe("today only");
  });
});
