import { describe, expect, it } from "vitest";
import { followUpDueBadge } from "../follow-up-due";

/**
 * The chip has to agree with the order the list is sorted in, or it actively
 * misleads: dated items count toward their date, undated ones report age. These
 * pin the boundaries where the wording (and the urgency colour) flips.
 */
describe("followUpDueBadge", () => {
  const now = new Date("2026-07-30T18:00:00Z");
  const created = new Date("2026-07-01T09:00:00Z");
  const dated = (iso: string) => ({ dueDate: new Date(iso), createdAt: created });

  it("counts calendar days, not 24h windows, so tomorrow morning is 'tomorrow'", () => {
    expect(followUpDueBadge(dated("2026-07-31T09:00:00Z"), now).label).toBe("due tomorrow");
  });

  it("says today for anything due on today's date, whatever the clock time", () => {
    expect(followUpDueBadge(dated("2026-07-30T02:00:00Z"), now).label).toBe("due today");
  });

  it("reports how far past due, since that is what sorts it to the top", () => {
    expect(followUpDueBadge(dated("2026-07-28T09:00:00Z"), now)).toEqual({
      label: "overdue 2 days",
      urgent: true,
    });
  });

  it("counts down for future dates and only flags the near ones as urgent", () => {
    expect(followUpDueBadge(dated("2026-08-02T09:00:00Z"), now)).toEqual({
      label: "due in 3 days",
      urgent: true,
    });
    expect(followUpDueBadge(dated("2026-08-20T09:00:00Z"), now)).toEqual({
      label: "due in 21 days",
      urgent: false,
    });
  });

  it("never calls an undated item late — it reports the age that ranks it", () => {
    const young = { dueDate: null, createdAt: new Date("2026-07-27T09:00:00Z") };
    expect(followUpDueBadge(young, now)).toEqual({ label: "open 3 days", urgent: false });
  });

  it("escalates an undated item once it has been waiting long enough to matter", () => {
    const old = { dueDate: null, createdAt: new Date("2026-07-16T09:00:00Z") };
    expect(followUpDueBadge(old, now)).toEqual({ label: "due for long", urgent: true });
  });

  it("singularises one day", () => {
    expect(followUpDueBadge(dated("2026-07-29T09:00:00Z"), now).label).toBe("overdue 1 day");
  });
});
