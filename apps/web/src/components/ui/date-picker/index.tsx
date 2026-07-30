"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { CalendarIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format-date";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CALENDAR_CLASS_NAMES } from "./calendar-class-names";
import { calendarStartMonth } from "./initial-month";

export { calendarStartMonth };

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  clearable?: boolean;
  fromDate?: Date;
  toDate?: Date;
  /** `"dropdown"` swaps the caption for month/year selects. Needed whenever the
   *  target can be years away (a birthday): the default label caption steps one
   *  month per click. Omitted = the label caption, unchanged. Note the year list
   *  only renders with BOTH `fromDate` and `toDate` — react-day-picker's
   *  `getYearOptions` returns nothing without them, and an absent `toDate` becomes
   *  end-of-this-year, quietly barring future days. */
  captionLayout?: DayPickerProps["captionLayout"];
  /** Month to open on. Defaults to the selected day's — see {@link calendarStartMonth}. */
  defaultMonth?: Date;
}

/**
 * Single-date picker: an outline trigger showing the formatted date (or
 * placeholder) that opens a Base UI popover holding a react-day-picker calendar.
 * When `name` is set it also emits a hidden ISO input, so it submits inside a
 * plain server-action `<form>` as well as a controlled client form.
 */
export function DatePicker({
  value,
  onChange,
  name,
  placeholder = "Pick a date",
  disabled = false,
  id,
  clearable = true,
  fromDate,
  toDate,
  captionLayout,
  defaultMonth,
}: DatePickerProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-11 w-full justify-start gap-2 rounded-lg px-3 font-normal",
              !value && "text-fog",
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-fog" />
            <span className="truncate">
              {value ? formatDate(value) : placeholder}
            </span>
          </Button>
        }
      />
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value ? value.toISOString() : ""}
        />
      ) : null}
      <PopoverContent align="start">
        <DayPicker
          mode="single"
          captionLayout={captionLayout}
          defaultMonth={calendarStartMonth(value, defaultMonth)}
          selected={value ?? undefined}
          onSelect={(day: Date | undefined) => {
            onChange(day ?? null);
            setOpen(false);
          }}
          disabled={
            fromDate || toDate
              ? [
                  ...(fromDate ? [{ before: fromDate }] : []),
                  ...(toDate ? [{ after: toDate }] : []),
                ]
              : undefined
          }
          startMonth={fromDate}
          endMonth={toDate}
          classNames={CALENDAR_CLASS_NAMES}
        />
        {clearable && value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-center gap-1.5 text-fog"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <XIcon className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
