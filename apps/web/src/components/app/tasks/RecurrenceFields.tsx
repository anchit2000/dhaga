"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  MONTH_OPTIONS,
  RECURRENCE_OPTIONS,
  RECURRENCE_UNIT_LABELS,
  WEEKDAY_OPTIONS,
} from "@/utils/constants/tasks";
import type { RecurrenceFrequency, RecurrenceRule } from "@dhaga/core";

export function RecurrenceFields({
  initial,
}: {
  initial: RecurrenceRule | null;
}): React.ReactElement {
  const [frequency, setFrequency] = useState<RecurrenceFrequency | "">(
    initial?.frequency ?? "",
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="space-y-1.5 text-xs font-medium text-fog">
        Repeat
        <Select
          className="min-h-11"
          name="recurrenceFrequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency | "")}
        >
          <option value="">Does not repeat</option>
          {RECURRENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </label>
      {frequency ? (
        <label className="space-y-1.5 text-xs font-medium text-fog">
          Every
          <span className="flex items-center gap-2">
            <Input
              name="recurrenceInterval"
              type="number"
              min={1}
              max={99}
              defaultValue={initial?.interval ?? 1}
              className="min-h-11 w-20"
            />
            <span className="text-sm text-paper">{RECURRENCE_UNIT_LABELS[frequency]}(s)</span>
          </span>
        </label>
      ) : null}
      {frequency === "weekly" ? (
        <label className="space-y-1.5 text-xs font-medium text-fog sm:col-span-2">
          Day of week
          <Select className="min-h-11" name="recurrenceWeekday" defaultValue={initial?.weekday ?? ""}>
            <option value="">Same weekday as due date</option>
            {WEEKDAY_OPTIONS.map((day) => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </Select>
        </label>
      ) : null}
      {frequency === "monthly" || frequency === "yearly" ? (
        <label className="space-y-1.5 text-xs font-medium text-fog">
          Day of month
          <Input className="min-h-11" name="recurrenceMonthDay" type="number" min={1} max={31}
            defaultValue={initial?.monthDay ?? ""} placeholder="From due date" />
        </label>
      ) : null}
      {frequency === "yearly" ? (
        <label className="space-y-1.5 text-xs font-medium text-fog">
          Month
          <Select className="min-h-11" name="recurrenceMonth" defaultValue={initial?.month ?? ""}>
            <option value="">From due date</option>
            {MONTH_OPTIONS.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </Select>
        </label>
      ) : null}
    </div>
  );
}
