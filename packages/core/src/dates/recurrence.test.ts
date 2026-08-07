import { describe, expect, it } from "vitest";
import {
  nextRecurrenceOccurrence,
  recurrenceRuleFromFields,
  type RecurrenceRule,
} from "./recurrence";

function rule(overrides: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    frequency: "weekly",
    interval: 1,
    weekday: null,
    monthDay: null,
    month: null,
    ...overrides,
  };
}

describe("nextRecurrenceOccurrence", () => {
  it("advances weekly rules to the chosen weekday", () => {
    expect(
      nextRecurrenceOccurrence(
        { year: 2026, month: 8, day: 6 },
        rule({ weekday: 1 }),
      ),
    ).toEqual({ year: 2026, month: 8, day: 10 });
  });

  it("honours multi-week intervals when the current occurrence is on the chosen day", () => {
    expect(
      nextRecurrenceOccurrence(
        { year: 2026, month: 8, day: 10 },
        rule({ interval: 2, weekday: 1 }),
      ),
    ).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it("clamps monthly day 31 rather than rolling into the following month", () => {
    expect(
      nextRecurrenceOccurrence(
        { year: 2026, month: 1, day: 31 },
        rule({ frequency: "monthly", monthDay: 31 }),
      ),
    ).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it("clamps a yearly leap-day recurrence in a non-leap year", () => {
    expect(
      nextRecurrenceOccurrence(
        { year: 2028, month: 2, day: 29 },
        rule({ frequency: "yearly", month: 2, monthDay: 29 }),
      ),
    ).toEqual({ year: 2029, month: 2, day: 28 });
  });

  it("rejects malformed rules instead of creating a surprising date", () => {
    expect(
      nextRecurrenceOccurrence(
        { year: 2026, month: 8, day: 6 },
        rule({ interval: 0 }),
      ),
    ).toBeNull();
  });

  it("maps nullable database fields and rejects an unknown frequency", () => {
    expect(
      recurrenceRuleFromFields({
        frequency: "weekly",
        interval: null,
        weekday: 5,
        monthDay: null,
        month: null,
      }),
    ).toEqual({ frequency: "weekly", interval: 1, weekday: 5, monthDay: null, month: null });
    expect(
      recurrenceRuleFromFields({
        frequency: "sometimes",
        interval: 1,
        weekday: null,
        monthDay: null,
        month: null,
      }),
    ).toBeNull();
  });
});
