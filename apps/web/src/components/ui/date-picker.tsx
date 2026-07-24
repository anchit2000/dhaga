"use client";

import * as React from "react";
import { DayPicker, type ClassNames } from "react-day-picker";
import { CalendarIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format-date";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Amber/seam/panel theme for react-day-picker, applied via `classNames` only —
 * no global `style.css` import — so the primitive stays self-contained and
 * matches the token approach in `combobox.tsx`. Day cells are 44px (touch
 * target); the selected day paints its `day_button` child amber.
 */
const CALENDAR_CLASS_NAMES: Partial<ClassNames> = {
  root: "text-paper",
  months: "relative",
  month: "space-y-2",
  month_caption: "flex h-11 items-center justify-center px-11",
  caption_label: "text-sm font-medium text-paper",
  nav: "absolute inset-x-0 top-0 flex h-11 items-center justify-between",
  button_previous:
    "inline-flex size-9 items-center justify-center rounded-lg text-fog outline-none hover:bg-wash/[0.08] hover:text-paper focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30",
  button_next:
    "inline-flex size-9 items-center justify-center rounded-lg text-fog outline-none hover:bg-wash/[0.08] hover:text-paper focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30",
  chevron: "size-4 fill-current",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "flex size-11 items-center justify-center text-xs font-normal text-fog",
  week: "flex",
  day: "p-0 text-center",
  day_button:
    "inline-flex size-11 items-center justify-center rounded-lg text-sm text-paper outline-none hover:bg-wash/[0.08] focus-visible:ring-2 focus-visible:ring-ring/50",
  today: "[&>button]:font-semibold [&>button]:text-amber",
  selected:
    "[&>button]:bg-amber [&>button]:font-semibold [&>button]:text-on-accent [&>button]:hover:bg-amber",
  outside: "[&>button]:text-fog/40",
  disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
  hidden: "invisible",
};

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
