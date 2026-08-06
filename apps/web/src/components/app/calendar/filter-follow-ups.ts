import { inTaskScope, matchesActionOrNames } from "@/lib/filters/follow-up-scope";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { CalendarStatusFilter } from "@/utils/constants/calendar";
import type { TaskFilter } from "@/utils/constants/tasks";

/**
 * Pure filtering for the calendar board. It lives apart from the UI because the
 * SAME predicate has to decide what lands on the grid and what stays in the
 * Unscheduled tray — a filter that only trimmed one of the two would quietly lie
 * about what "3 results" means.
 *
 * Everything here runs over the already-loaded set. No query, no server round
 * trip: the page has already paid for every follow-up.
 */

export type CalendarFilterState = {
  /** Free text, matched against the action, the contact and the company. */
  query: string;
  /** Reuses the /app/tasks scope vocabulary (TASK_FILTERS) verbatim. */
  scope: TaskFilter;
  status: CalendarStatusFilter;
  /** A contact id, or "" for every contact. */
  contactId: string;
  /** A company id, or "" for every company. */
  companyId: string;
};

/** The neutral state: everything visible. */
export const NO_CALENDAR_FILTERS: CalendarFilterState = {
  query: "",
  scope: "all",
  status: "all",
  contactId: "",
  companyId: "",
};

export type FollowUpOption = { id: string; name: string };

export function matchesCalendarFilters(item: CalendarFollowUp, f: CalendarFilterState): boolean {
  if (f.status !== "all" && item.status !== f.status) return false;
  if (f.contactId && item.contactId !== f.contactId) return false;
  if (f.companyId && item.companyId !== f.companyId) return false;
  // Scope and free text come from the module /app/tasks uses, so "General" and
  // a name search cannot mean one thing here and another on the task board.
  return inTaskScope(item, f.scope) && matchesActionOrNames(item, f.query);
}

export function filterFollowUps(
  items: CalendarFollowUp[],
  f: CalendarFilterState,
): CalendarFollowUp[] {
  return items.filter((item) => matchesCalendarFilters(item, f));
}

/**
 * Is anything narrowing the view? Drives the "no matches" message — an empty
 * grid means something very different depending on the answer, and telling a
 * user with no follow-ups at all to "clear your filters" is a dead end.
 */
export function isCalendarFilterActive(f: CalendarFilterState): boolean {
  return (
    f.query.trim() !== "" ||
    f.scope !== "all" ||
    f.status !== "all" ||
    f.contactId !== "" ||
    f.companyId !== ""
  );
}

/** Distinct id→name pairs, alphabetical; entries missing either half are dropped. */
function distinct(pairs: readonly (readonly [string | null, string | null])[]): FollowUpOption[] {
  const byId = new Map<string, string>();
  for (const [id, name] of pairs) if (id && name) byId.set(id, name);
  return [...byId]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The person/company dropdown options come from the LOADED follow-ups, not from
 * the directory: offering a contact with nothing on the calendar would be a
 * filter that can only ever return nothing.
 */
export function followUpPeople(items: CalendarFollowUp[]): FollowUpOption[] {
  return distinct(items.map((item) => [item.contactId, item.contactName] as const));
}

export function followUpCompanies(items: CalendarFollowUp[]): FollowUpOption[] {
  return distinct(items.map((item) => [item.companyId, item.companyName] as const));
}
