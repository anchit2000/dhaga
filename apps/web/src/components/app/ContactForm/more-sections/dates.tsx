"use client";

import { formatCalendarDate, parseImportantDate } from "@dhaga/core/src/dates";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  IMPORTANT_DATE_FUTURE_YEARS,
  IMPORTANT_DATE_MIN_YEAR,
} from "@/utils/constants/important-dates";
import { RepeatableList } from "../RepeatableList";
import { SectionHeader } from "../section-header";
import type { ImportantDate } from "@dhaga/core";

const IMPORTANT_DATE_FLOOR = new Date(IMPORTANT_DATE_MIN_YEAR, 0, 1);
const IMPORTANT_DATE_CEILING = new Date(
  new Date().getFullYear() + IMPORTANT_DATE_FUTURE_YEARS,
  11,
  31,
);

/**
 * The day a stored `ImportantDate.value` can preselect: a full `YYYY-MM-DD` only.
 * Year-less "03-14" and verbatim "December 9" (what the Google/vCard importers
 * deliberately write) select nothing, so they stay in state untouched and ride the
 * trigger as placeholder text instead — rewriting one on mount would lose the
 * user's text and, since the sync key is `label|value`, re-create the entry.
 */
function pickedDate(value: string): Date | null {
  const d = parseImportantDate(value);
  return d && d.year !== null ? new Date(d.year, d.month - 1, d.day) : null;
}

export function DateSection({
  items,
  onChange,
}: {
  items: ImportantDate[];
  onChange: (next: ImportantDate[]) => void;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title="Important dates" />
      <RepeatableList
        items={items}
        onChange={onChange}
        makeEmpty={() => ({ label: "Birthday", value: "", note: null })}
        addLabel="Add date"
        renderRow={(item, update) => (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={item.label}
              placeholder="Label (Birthday)"
              onChange={(event) => update({ label: event.target.value })}
            />
            <DatePicker
              value={pickedDate(item.value)}
              onChange={(date) => update({ value: date ? formatCalendarDate(date) : "" })}
              placeholder={item.value.trim() || "Pick a date"}
              // Birthdays are decades back, so the label caption (one month per
              // click) can't reach them. The year dropdown needs BOTH bounds —
              // react-day-picker's getYearOptions bails without them, and an
              // absent upper bound silently becomes end-of-this-year, which would
              // lock out an anniversary still to come.
              captionLayout="dropdown"
              fromDate={IMPORTANT_DATE_FLOOR}
              toDate={IMPORTANT_DATE_CEILING}
            />
          </div>
        )}
      />
    </section>
  );
}
