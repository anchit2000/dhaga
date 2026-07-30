import { describe, expect, it } from "vitest";
import { buildProfilePayload } from "@/components/app/ContactForm/payload";
// Deep import: the barrel pulls React/react-day-picker in, which costs this
// node-environment file ~70s of transform for one pure function.
import { calendarStartMonth } from "@/components/ui/date-picker/initial-month";
import {
  contactProfileSchema,
  emptyContactProfile,
  formatCalendarDate,
  type ContactProfile,
} from "@dhaga/core";

function profile(overrides: Partial<ContactProfile>): ContactProfile {
  return { ...emptyContactProfile(), ...overrides };
}

/**
 * The form serializes its live state to one JSON field the server re-validates.
 * This is the seam where a stray "Add" click could persist a blank job or an
 * empty phone. buildProfilePayload must drop those and emit something
 * contactProfileSchema.parse (what the action runs) accepts unchanged.
 */
describe("buildProfilePayload", () => {
  it("trims, drops empty rows, and stays schema-valid", () => {
    const json = buildProfilePayload(
      profile({
        name: "  Ada Lovelace  ",
        positions: [
          { title: "  Analyst ", company: " Analytical Engines ", department: null, current: true, startedAt: null, endedAt: null, note: null },
          { title: "", company: "", department: null, current: false, startedAt: null, endedAt: null, note: null },
        ],
        emails: [
          { value: " ada@example.com ", label: " Work ", note: null },
          { value: "   ", label: "Home", note: null },
        ],
        importantDates: [{ label: "", value: "1815-12-10", note: null }],
        customFields: [{ label: "", value: "" }],
      }),
    );

    // Round-trips through the exact validator the server action uses.
    const parsed = contactProfileSchema.parse(JSON.parse(json));
    expect(parsed.name).toBe("Ada Lovelace");
    expect(parsed.positions).toHaveLength(1);
    expect(parsed.positions[0]).toMatchObject({ title: "Analyst", company: "Analytical Engines" });
    expect(parsed.emails).toEqual([{ value: "ada@example.com", label: "Work", note: null }]);
    expect(parsed.importantDates).toEqual([{ label: "Date", value: "1815-12-10", note: null }]);
    expect(parsed.customFields).toEqual([]);
  });
});

/**
 * "Important dates" is a CALENDAR PICKER over a FREE-TEXT column. Imports write
 * values the calendar can't represent (year-less birthdays, verbatim prose), and
 * the picker must never launder them: the sync identity key is `label|value`
 * lowercased, so reformatting a value on mount doesn't edit that entry — it
 * deletes it and inserts a different one. These cases pin the two halves of that
 * contract at the serialization seam: an untouched row goes out byte-identical,
 * and a row the user actually picked goes out as a local `YYYY-MM-DD`.
 */
describe("buildProfilePayload — important dates", () => {
  it("passes an unpickable stored value through untouched", () => {
    // What DateSection holds in state for these rows: the raw string. The picker
    // shows it as placeholder text and writes nothing unless the user picks.
    const json = buildProfilePayload(
      profile({
        name: "Ada Lovelace",
        importantDates: [
          { label: "Birthday", value: "December 9", note: null },
          { label: "Birthday", value: "03-14", note: null },
          { label: "Anniversary", value: "spring 2019", note: null },
        ],
      }),
    );

    expect(contactProfileSchema.parse(JSON.parse(json)).importantDates).toEqual([
      { label: "Birthday", value: "December 9", note: null },
      { label: "Birthday", value: "03-14", note: null },
      { label: "Anniversary", value: "spring 2019", note: null },
    ]);
  });

  it("serializes a picked day as a local YYYY-MM-DD, not a UTC-shifted instant", () => {
    // react-day-picker hands back LOCAL midnight of the clicked day. Serializing
    // that with toISOString() lands 1985-01-01 on 1984-12-31 for every user east
    // of UTC (and any evening date a day late west of it) — a birthday reminder
    // on the wrong day, and a different sync key.
    const picked = new Date(1985, 0, 1);
    const json = buildProfilePayload(
      profile({
        name: "Ada Lovelace",
        importantDates: [{ label: "Birthday", value: formatCalendarDate(picked), note: null }],
      }),
    );

    const value = contactProfileSchema.parse(JSON.parse(json)).importantDates[0].value;
    expect(value).toBe("1985-01-01");
    // No time component can reach the column: `label|value` keys must be stable
    // across saves, and a timestamp changes on every one.
    expect(value).not.toMatch(/[TZ:]/);
  });

  it("opens the calendar on the stored year, not on today", () => {
    // react-day-picker decides the visible month from `defaultMonth`, never from
    // `selected`, and its label caption moves one month per click. Without this
    // derivation a 1985 birthday opens ~500 clicks away from the day it is
    // already showing — the whole reason this field could not be a picker before.
    const stored = new Date(1985, 2, 14);
    expect(calendarStartMonth(stored)).toEqual(stored);

    // An explicit defaultMonth still wins (a caller wanting a fixed landing month)…
    const landing = new Date(2026, 0, 1);
    expect(calendarStartMonth(stored, landing)).toEqual(landing);

    // …and with neither, the result is undefined so DayPicker keeps falling back
    // to today. This is what makes the prop additive: the follow-up and
    // subscription-expiry pickers, which pass none of it, behave exactly as before.
    expect(calendarStartMonth(null)).toBeUndefined();
  });

  it("drops a row whose date was cleared", () => {
    // The picker's Clear writes "" back into state rather than removing the row
    // (RepeatableList owns removal), so this filter is what stops an empty
    // "Birthday" from persisting — and what lets Zod's required string hold.
    const json = buildProfilePayload(
      profile({
        name: "Ada Lovelace",
        importantDates: [
          { label: "Birthday", value: "", note: null },
          { label: "Anniversary", value: "2019-06-01", note: null },
        ],
      }),
    );

    expect(contactProfileSchema.parse(JSON.parse(json)).importantDates).toEqual([
      { label: "Anniversary", value: "2019-06-01", note: null },
    ]);
  });
});
