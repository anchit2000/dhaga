"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EventClickArg } from "@fullcalendar/core";
import { useDebouncedValue } from "@/lib/data";
import { LIST_SEARCH_DEBOUNCE_MS } from "@/utils/constants/table";
import type { CalendarFollowUp, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { ExternalCalendarEvent } from "@/lib/repo/calendar";
import {
  isFollowUpEventProps,
  isImportantDateEventProps,
  toCalendarEvents,
  toExternalCalendarEvents,
  toImportantDateEvents,
  unscheduledFollowUps,
  type CalendarEventProps,
} from "./event-map";
import {
  filterFollowUps,
  isCalendarFilterActive,
  NO_CALENDAR_FILTERS,
  type CalendarFilterState,
} from "./filter-follow-ups";
import { selectedFromEvent, selectedFromFollowUp } from "./to-selected";
import { CalendarCaption } from "./CalendarCaption";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { CalendarFilters } from "./CalendarFilters";
import { CalendarGrid } from "./CalendarGrid";
import { useReschedule } from "./use-reschedule";
import { UnscheduledTray } from "./UnscheduledTray";
import { EventDetailsDialog, type SelectedFollowUp } from "./EventDetailsDialog";
import "./calendar-theme.css";

/**
 * Full-screen follow-up calendar — open work and, struck through, work already
 * done. Drag a dated event or a tray chip onto the grid to reschedule it;
 * clicking either opens the details dialog.
 *
 * `useReschedule` owns the ONE follow-up list every surface derives from, so the
 * search box and filters trim the grid and the Unscheduled tray together — a
 * filter that moved only one of the two would misrepresent what is left.
 * `externalEvents` are read-only context from a CONNECTED calendar, merged onto
 * the same grid: they cannot be dragged and clicking one opens nothing, because
 * Dhaga owns no record. `importantDates` are recurring birthday/anniversary
 * occurrences DERIVED from contacts — also read-only, but a click opens the
 * contact for editing. Neither is filtered: the filters are about follow-ups.
 */
export function CalendarBoard({
  items,
  externalEvents,
  importantDates,
}: {
  items: CalendarFollowUp[];
  externalEvents: ExternalCalendarEvent[];
  importantDates: UpcomingImportantDate[];
}) {
  const router = useRouter();
  const { followUps, handleEventDrop, handleEventReceive, handleResolved } = useReschedule(items);
  const [filters, setFilters] = useState<CalendarFilterState>(NO_CALENDAR_FILTERS);
  const query = useDebouncedValue(filters.query, LIST_SEARCH_DEBOUNCE_MS);
  const active = useMemo(() => ({ ...filters, query }), [filters, query]);
  const visible = useMemo(() => filterFollowUps(followUps, active), [followUps, active]);
  const trayItems = useMemo(() => unscheduledFollowUps(visible), [visible]);
  const events = useMemo(
    () => [
      ...toCalendarEvents(visible),
      ...toImportantDateEvents(importantDates),
      ...toExternalCalendarEvents(externalEvents),
    ],
    [visible, externalEvents, importantDates],
  );
  const [selected, setSelected] = useState<SelectedFollowUp | null>(null);

  function handleEventClick(arg: EventClickArg): void {
    const props = arg.event.extendedProps as CalendarEventProps;
    if (isImportantDateEventProps(props)) {
      // Derived from the contact, with no record of its own to complete or
      // reschedule — the contact page is the only honest destination, and it is
      // where the date is edited.
      router.push(`/app/people/${props.contactId}`);
      return;
    }
    // Anything that is not a follow-up has no Dhaga record to complete, dismiss
    // or reschedule — the details dialog would be lying. It stays inert.
    if (!isFollowUpEventProps(props)) return;
    setSelected(selectedFromEvent(arg.event.id, props));
  }

  // Only when there is nothing at all: a connected calendar with events — or a
  // single stored birthday — is reason to render the grid before the first
  // follow-up exists.
  if (items.length === 0 && externalEvents.length === 0 && importantDates.length === 0) {
    return <CalendarEmptyState />;
  }

  return (
    <div className="space-y-4">
      {followUps.length > 0 ? (
        <CalendarFilters items={followUps} value={filters} onChange={setFilters} />
      ) : null}
      {trayItems.length > 0 ? (
        <UnscheduledTray
          items={trayItems}
          onSelect={(item) => setSelected(selectedFromFollowUp(item))}
        />
      ) : null}
      {/* Distinct from CalendarEmptyState: there IS work, it is just filtered out
          — and the grid below still shows unfiltered calendar/birthday context. */}
      {followUps.length > 0 && visible.length === 0 && isCalendarFilterActive(active) ? (
        <p className="rounded-2xl border border-seam bg-panel/40 px-4 py-6 text-center text-sm text-fog">
          No follow-ups match your search or filters.
        </p>
      ) : null}
      <CalendarGrid
        events={events}
        onEventDrop={handleEventDrop}
        onEventReceive={handleEventReceive}
        onEventClick={handleEventClick}
      />
      <CalendarCaption
        hasExternal={externalEvents.length > 0}
        hasImportantDates={importantDates.length > 0}
      />
      <EventDetailsDialog
        selected={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onResolved={handleResolved}
      />
    </div>
  );
}
