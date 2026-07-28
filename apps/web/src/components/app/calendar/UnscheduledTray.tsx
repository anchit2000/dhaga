"use client";

import { useEffect, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * The date-less follow-ups, as chips you drag onto the grid to schedule them.
 * Uses FullCalendar's external-drag Draggable: each chip carries the follow-up
 * id + name as data-attributes, which `eventData` turns into the dropped event
 * (see CalendarBoard's eventReceive). The parent renders this only when there
 * are items and removes a chip on a successful drop, so an empty tray never
 * shows. The Draggable is (re)bound whenever the collapsible row mounts.
 */
export function UnscheduledTray({ items }: { items: CalendarFollowUp[] }) {
  const [open, setOpen] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const draggable = new Draggable(el, {
      itemSelector: "[data-followup-id]",
      longPressDelay: 200,
      eventData: (chip) => ({
        id: chip.getAttribute("data-followup-id") ?? "",
        title: chip.getAttribute("data-followup-title") ?? "",
        create: true,
      }),
    });
    return () => draggable.destroy();
  }, [open]);

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
            <div
              key={item.id}
              data-followup-id={item.id}
              data-followup-title={item.contactName}
              title={item.action}
              className="flex min-h-[44px] shrink-0 cursor-grab select-none flex-col justify-center rounded-xl border border-seam bg-panel px-3 py-2 transition-colors hover:border-amber/40 active:cursor-grabbing"
            >
              <span className="text-sm font-medium text-paper">{item.contactName}</span>
              <span className="max-w-[12rem] truncate text-xs text-fog">{item.action}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
