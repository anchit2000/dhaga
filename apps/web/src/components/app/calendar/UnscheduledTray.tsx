"use client";

import { useEffect, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRAY_CHIP_CLICK_SLOP_PX } from "@/utils/constants/calendar";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * The date-less follow-ups, as chips you drag onto the grid to schedule them —
 * or click to read in full. Uses FullCalendar's external-drag Draggable: each
 * chip carries the follow-up id + name as data-attributes, which `eventData`
 * turns into the dropped event (see CalendarBoard's eventReceive). The parent
 * renders this only when there are items, so an empty tray never shows. The
 * Draggable is (re)bound whenever the collapsible row mounts.
 *
 * Each chip is a real <button>, because the action text is truncated on it and
 * the only way to read the rest used to be a native `title` tooltip — invisible
 * on touch, and unreachable by keyboard. Enter/Space open the same dialog the
 * grid does.
 */
export function UnscheduledTray({
  items,
  onSelect,
}: {
  items: CalendarFollowUp[];
  onSelect: (item: CalendarFollowUp) => void;
}) {
  const [open, setOpen] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);
  /** Where the pointer went down, so a drag is not mistaken for a click. */
  const pressedAt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const draggable = new Draggable(el, {
      itemSelector: "[data-followup-id]",
      longPressDelay: 200,
      eventData: (chip) => ({
        id: chip.getAttribute("data-followup-id") ?? "",
        title: chip.getAttribute("data-followup-title") ?? "Task",
        create: true,
      }),
    });
    return () => draggable.destroy();
  }, [open]);

  /**
   * A chip is both a drag source and a button, so the release has to be
   * classified. Anything that travelled further than the slop was a drag —
   * including one abandoned off the grid, which must do nothing rather than pop
   * the dialog.
   *
   * Keyboard activation is checked FIRST, on `detail === 0` (Enter/Space report
   * no click count and no coordinates). Inferring it from a null press point
   * instead would break after any drag released off a chip: no click event
   * fires there, so the stale press point survives and would then measure a
   * keyboard event's 0,0 as a long drag and silently swallow it.
   */
  function handleClick(item: CalendarFollowUp, event: React.MouseEvent): void {
    const from = pressedAt.current;
    pressedAt.current = null;
    if (event.detail === 0) {
      onSelect(item);
      return;
    }
    if (
      from &&
      (Math.abs(event.clientX - from.x) > TRAY_CHIP_CLICK_SLOP_PX ||
        Math.abs(event.clientY - from.y) > TRAY_CHIP_CLICK_SLOP_PX)
    ) {
      return;
    }
    onSelect(item);
  }

  return (
    <section className="rounded-2xl border border-seam bg-panel/60 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
          Unscheduled · {items.length}
        </span>
        <ChevronDown className={cn("size-4 text-fog transition-transform", !open && "-rotate-90")} />
      </button>

      {open ? (
        <div ref={rowRef} className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              data-followup-id={item.id}
              data-followup-title={item.associationLabel}
              onPointerDown={(e) => {
                pressedAt.current = { x: e.clientX, y: e.clientY };
              }}
              onClick={(e) => handleClick(item, e)}
              className="flex min-h-[44px] shrink-0 cursor-grab select-none flex-col justify-center rounded-xl border border-seam bg-panel px-3 py-2 text-left transition-colors outline-none hover:border-amber/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
            >
              <span className="text-sm font-medium text-paper">{item.associationLabel}</span>
              <span className="max-w-[12rem] truncate text-xs text-fog">{item.action}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
