"use client";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ReactElement } from "react";
import type { WrappedScope, WrappedScopeOption } from "@dhaga/core/src/api/wrapped";

/**
 * Scope picker: the fixed windows as a horizontally-scrollable chip row (44px
 * touch targets) plus a native select for events, which can be many.
 */
export function ScopeSelector({
  options,
  value,
  onChange,
  disabled,
}: {
  options: WrappedScopeOption[];
  value: WrappedScope;
  onChange: (scope: WrappedScope) => void;
  disabled?: boolean;
}): ReactElement {
  const windows = options.filter((option) => option.kind !== "event");
  const events = options.filter((option) => option.kind === "event");

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {windows.map((option) => {
          const active = value.kind === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ kind: option.kind })}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm transition",
                active
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-seam text-fog hover:text-paper",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {events.length > 0 ? (
        <Select
          disabled={disabled}
          value={value.kind === "event" ? value.eventId ?? "" : ""}
          onChange={(event) => {
            const eventId = event.target.value;
            if (eventId) onChange({ kind: "event", eventId });
          }}
          className="max-w-xs"
        >
          <option value="">Pick an event…</option>
          {events.map((option) => (
            <option key={option.eventId} value={option.eventId}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : null}
    </div>
  );
}
