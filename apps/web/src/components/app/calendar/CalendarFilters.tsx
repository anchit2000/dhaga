"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CALENDAR_STATUS_FILTERS } from "@/utils/constants/calendar";
import { TASK_FILTERS } from "@/utils/constants/tasks";
import { followUpCompanies, followUpPeople, type CalendarFilterState } from "./filter-follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * One restrained row of controls over the follow-ups already on the board:
 * search, then person, company, scope and status. Person and company are derived
 * from `items`, so a graph with no company work never shows a company select at
 * all rather than an empty one.
 *
 * Purely presentational — every decision about what the filters MEAN lives in
 * ./filter-follow-ups.ts, which the tray and the grid share.
 *
 * At 375px the search box takes the full width and the selects scroll
 * horizontally beneath it; every control is 44px tall.
 */
export function CalendarFilters({
  items,
  value,
  onChange,
}: {
  items: CalendarFollowUp[];
  value: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
}): React.ReactElement {
  const people = followUpPeople(items);
  const companies = followUpCompanies(items);
  const selectClass = "h-11 w-auto shrink-0 text-sm";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog"
          aria-hidden
        />
        <Input
          type="search"
          value={value.query}
          aria-label="Search follow-ups"
          placeholder="Search follow-ups"
          className="h-11 pl-9"
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {people.length > 0 ? (
          <Select
            aria-label="Filter by person"
            className={selectClass}
            value={value.contactId}
            onChange={(e) => onChange({ ...value, contactId: e.target.value })}
          >
            <option value="">All people</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        ) : null}
        {companies.length > 0 ? (
          <Select
            aria-label="Filter by company"
            className={selectClass}
            value={value.companyId}
            onChange={(e) => onChange({ ...value, companyId: e.target.value })}
          >
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          aria-label="Filter by scope"
          className={selectClass}
          value={value.scope}
          onChange={(e) => onChange({ ...value, scope: e.target.value as CalendarFilterState["scope"] })}
        >
          {TASK_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.value === "all" ? "All items" : filter.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by status"
          className={selectClass}
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as CalendarFilterState["status"] })}
        >
          {CALENDAR_STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.value === "all" ? "Any status" : filter.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
