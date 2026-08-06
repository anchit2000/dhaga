import { Select } from "@/components/ui/select";
import {
  CADENCE_RECURRENCE,
  MONTH_DAY_OPTIONS,
  MONTH_OPTIONS,
  WEEKDAY_OPTIONS,
} from "@/utils/constants/keep-in-touch";
import type { CadenceFormSelection } from "@/types";

export function ScheduleFields({
  value,
  disabled,
  onChange,
}: {
  value: CadenceFormSelection;
  disabled: boolean;
  onChange: (next: CadenceFormSelection) => void;
}): React.ReactElement | null {
  const config = CADENCE_RECURRENCE[Number(value.days)];
  if (!config || config.frequency === "daily") return null;
  const weekly = config.frequency === "weekly";
  const annual = config.frequency === "yearly" || config.interval === 6;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {weekly ? (
        <Select
          value={value.weekday}
          onChange={(event) => onChange({ ...value, weekday: event.target.value })}
          disabled={disabled}
          aria-label="Day of week"
          className="h-11 text-xs sm:col-span-2"
        >
          <option value="">Auto · spread across the week</option>
          {WEEKDAY_OPTIONS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
        </Select>
      ) : null}
      {annual ? (
        <Select
          value={value.month}
          onChange={(event) => onChange({ ...value, month: event.target.value })}
          disabled={disabled}
          aria-label="Month"
          className="h-11 text-xs"
        >
          <option value="">Same month as last touch</option>
          {MONTH_OPTIONS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
        </Select>
      ) : null}
      {!weekly ? (
        <Select
          value={value.monthDay}
          onChange={(event) => onChange({ ...value, monthDay: event.target.value })}
          disabled={disabled}
          aria-label="Day of month"
          className={`h-11 text-xs ${annual ? "" : "sm:col-span-2"}`}
        >
          <option value="">Same day as last touch</option>
          {MONTH_DAY_OPTIONS.map((day) => <option key={day} value={day}>{day}</option>)}
        </Select>
      ) : null}
    </div>
  );
}
