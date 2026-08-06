import { describe, expect, it } from "vitest";
import { inTaskScope, matchesActionOrNames } from "@/lib/filters/follow-up-scope";
import { inScope, matchesTaskSearch } from "@/components/app/tasks/filters";
import { matchesCalendarFilters, NO_CALENDAR_FILTERS } from "@/components/app/calendar/filter-follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { TaskItem } from "@/lib/repo/tasks";

/**
 * WHY this test exists: /app/tasks and /app/calendar each filter the same
 * follow-ups, and they used to own separate copies of the scope and search
 * rules. Two copies of "what does General mean?" drift silently — both screens
 * stay individually plausible while disagreeing, and a user who sees three
 * General items on one and four on the other has simply been misinformed.
 *
 * So these assertions are deliberately CROSS-SCREEN: the same row is put
 * through both call sites and required to get the same answer. They fail if
 * anyone re-inlines a local copy of either predicate.
 */

function task(over: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "t1",
    contactId: null,
    contactName: null,
    companyId: null,
    companyName: null,
    action: "Send the deck",
    dueHint: null,
    dueDate: null,
    recurrence: null,
    status: "open",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...over,
  };
}

function followUp(over: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "f1",
    contactId: null,
    contactName: null,
    companyId: null,
    companyName: null,
    associationLabel: "Personal task",
    recurrence: null,
    action: "Send the deck",
    dueDate: null,
    dueHint: null,
    overdue: false,
    status: "open",
    ...over,
  };
}

describe("scope, across both screens", () => {
  it("calls a task with no contact and no company General on Tasks AND on Calendar", () => {
    // The general/personal task is the row the two screens most easily disagree
    // about, because it is defined by two absences rather than a value.
    expect(inScope(task(), "general")).toBe(true);
    expect(matchesCalendarFilters(followUp(), { ...NO_CALENDAR_FILTERS, scope: "general" })).toBe(true);
  });

  it("excludes that same task from People on both screens", () => {
    expect(inScope(task(), "people")).toBe(false);
    expect(matchesCalendarFilters(followUp(), { ...NO_CALENDAR_FILTERS, scope: "people" })).toBe(false);
  });

  it("stops calling a task General as soon as a company is attached, even with no person", () => {
    const attached = { contactId: null, companyId: "c1", companyName: "Acme" };
    expect(inScope(task(attached), "general")).toBe(false);
    expect(matchesCalendarFilters(followUp(attached), { ...NO_CALENDAR_FILTERS, scope: "general" })).toBe(false);
    // …and it must then show under Companies rather than falling through a gap.
    expect(inScope(task(attached), "companies")).toBe(true);
    expect(matchesCalendarFilters(followUp(attached), { ...NO_CALENDAR_FILTERS, scope: "companies" })).toBe(true);
  });
});

describe("search, across both screens", () => {
  it("finds a row by its company when the action text never names it", () => {
    // The whole point of searching names: "that thing for Acme" is how the row
    // is remembered, not how it was written down.
    const row = { action: "Send the deck", companyId: "c1", companyName: "Acme" };
    expect(matchesTaskSearch(task(row), "acme")).toBe(true);
    expect(matchesCalendarFilters(followUp(row), { ...NO_CALENDAR_FILTERS, query: "acme" })).toBe(true);
  });

  it("finds a row by its person", () => {
    const row = { contactId: "p1", contactName: "Shalini Chaudhari" };
    expect(matchesTaskSearch(task(row), "shalini")).toBe(true);
    expect(matchesCalendarFilters(followUp(row), { ...NO_CALENDAR_FILTERS, query: "shalini" })).toBe(true);
  });

  it("treats an empty or whitespace query as no filter, so an empty box hides nothing", () => {
    expect(matchesActionOrNames(task(), "   ")).toBe(true);
    expect(matchesCalendarFilters(followUp(), { ...NO_CALENDAR_FILTERS, query: "   " })).toBe(true);
  });

  it("does not match a row that has neither the word nor the names", () => {
    expect(matchesTaskSearch(task(), "invoice")).toBe(false);
    expect(matchesCalendarFilters(followUp(), { ...NO_CALENDAR_FILTERS, query: "invoice" })).toBe(false);
  });

  it("ignores case on both the query and the stored value", () => {
    expect(inTaskScope({ contactId: null, companyId: null }, "all")).toBe(true);
    expect(matchesActionOrNames({ action: "Send the DECK", contactName: null, companyName: null }, "deck")).toBe(true);
  });
});
