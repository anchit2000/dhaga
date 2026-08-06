import { describe, expect, it } from "vitest";
import {
  filterFollowUps,
  followUpCompanies,
  followUpPeople,
  isCalendarFilterActive,
  NO_CALENDAR_FILTERS,
  type CalendarFilterState,
} from "../filter-follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * Scope, status and owner filtering (search lives in ./filter-search.test.ts):
 *
 *  - the /app/tasks scope vocabulary must mean the same thing here. A general
 *    task (no contact, no company) is real work and must survive "General"; it
 *    must also be excluded by "People", or "People" is just "All".
 *  - status is a filter, not a data change: done rows are LOADED, so hiding them
 *    has to be reversible without a round trip.
 *  - the owner dropdowns are built from the set on screen, so they can never
 *    offer a choice that returns nothing.
 */
function item(over: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "fu-1",
    contactId: "c-ada",
    contactName: "Ada Lovelace",
    companyId: null,
    companyName: null,
    associationLabel: "Ada Lovelace",
    recurrence: null,
    action: "Send the deck",
    dueDate: "2026-08-03T00:00:00.000Z",
    dueHint: null,
    status: "open",
    overdue: false,
    ...over,
  };
}

const filters = (over: Partial<CalendarFilterState> = {}): CalendarFilterState => ({
  ...NO_CALENDAR_FILTERS,
  ...over,
});

const acme = item({
  id: "fu-acme",
  contactId: null,
  contactName: null,
  companyId: "co-acme",
  companyName: "Acme Corp",
  associationLabel: "Acme Corp",
  action: "Renew the contract",
});
const personal = item({
  id: "fu-personal",
  contactId: null,
  contactName: null,
  associationLabel: "Personal task",
  action: "Book the flights",
});

describe("scope", () => {
  it("keeps a general task under General and drops the attached ones", () => {
    // A task with neither contact nor company is the user's own work — the one
    // kind that has no other surface to be found on.
    expect(filterFollowUps([item(), acme, personal], filters({ scope: "general" }))).toEqual([
      personal,
    ]);
  });

  it("EXCLUDES general tasks under People, or the filter means nothing", () => {
    expect(
      filterFollowUps([item(), acme, personal], filters({ scope: "people" })).map((f) => f.id),
    ).toEqual(["fu-1"]);
  });

  it("selects company work under Companies", () => {
    expect(filterFollowUps([item(), acme, personal], filters({ scope: "companies" }))).toEqual([
      acme,
    ]);
  });
});

describe("status", () => {
  const done = item({ id: "fu-done", status: "done" });

  it("shows open and done together by default, which is why done rows load at all", () => {
    expect(filterFollowUps([item(), done], filters()).length).toBe(2);
  });

  it("hides finished work on demand without touching the loaded set", () => {
    expect(filterFollowUps([item(), done], filters({ status: "open" })).map((f) => f.id)).toEqual([
      "fu-1",
    ]);
    expect(filterFollowUps([item(), done], filters({ status: "done" })).map((f) => f.id)).toEqual([
      "fu-done",
    ]);
  });
});

describe("person and company selects", () => {
  it("narrows to one owner at a time", () => {
    expect(filterFollowUps([item(), acme], filters({ contactId: "c-ada" })).map((f) => f.id)).toEqual(
      ["fu-1"],
    );
    expect(
      filterFollowUps([item(), acme], filters({ companyId: "co-acme" })).map((f) => f.id),
    ).toEqual(["fu-acme"]);
  });

  it("offers only owners that actually have follow-ups loaded", () => {
    // Options come from the set on screen: a contact with nothing on the
    // calendar would be a choice that can only ever return nothing.
    expect(followUpPeople([item(), item({ id: "fu-2" }), acme, personal])).toEqual([
      { id: "c-ada", name: "Ada Lovelace" },
    ]);
    expect(followUpCompanies([item(), personal])).toEqual([]);
  });

  it("sorts owners alphabetically so the list is scannable", () => {
    const zoe = item({ id: "fu-z", contactId: "c-zoe", contactName: "Zoe Bell" });
    const bo = item({ id: "fu-b", contactId: "c-bo", contactName: "Bo Chen" });
    expect(followUpPeople([zoe, bo]).map((p) => p.name)).toEqual(["Bo Chen", "Zoe Bell"]);
  });
});

describe("isCalendarFilterActive", () => {
  it("separates 'nothing matches your filters' from 'you have no follow-ups'", () => {
    // The two empty states give opposite advice; conflating them tells a user
    // with an empty graph to clear filters they never set.
    expect(isCalendarFilterActive(filters())).toBe(false);
    expect(isCalendarFilterActive(filters({ query: "   " }))).toBe(false);
    expect(isCalendarFilterActive(filters({ status: "done" }))).toBe(true);
    expect(isCalendarFilterActive(filters({ contactId: "c-ada" }))).toBe(true);
  });
});
