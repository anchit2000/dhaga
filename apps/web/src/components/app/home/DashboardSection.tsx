import Link from "next/link";
import { dayLoad, findOpenSlots } from "@dhaga/core";
import { HomeDashboard } from "@/components/app/home/HomeDashboard";
import { HomeTile } from "@/components/app/home/HomeTile";
import { RelationshipInbox } from "@/components/app/relationships/RelationshipInbox";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";
import { Button } from "@/components/ui/button";
import { getCachedNodeTypes } from "@/lib/cache/node-types";
import { getFreeBusy, hasCalendarConnection } from "@/lib/repo/calendar";
import { listContacts } from "@/lib/repo/contacts";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { listPendingEdgeSuggestions } from "@/lib/repo/edge-suggestions";
import { listEvents } from "@/lib/repo/events";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listNewSignals } from "@/lib/repo/signals";
import { listQuietContacts } from "@/lib/repo/strength";
import { getSuggestedClusters } from "@/lib/repo/suggestions";
import { getSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { DEFAULT_MEETING_DURATION_MINUTES } from "@/utils/constants/suggestions";
import { formatDayline } from "@/utils/format-date";
import type { ReactElement } from "react";

const WEEK_MS = 7 * 86_400_000;

/**
 * Home's header (daily-briefing headline) plus the bento dashboard. These share
 * one Suspense boundary because the interactive tiles all live inside the single
 * `HomeDashboard` client component (one CSS grid + one shared ContactDetailSheet),
 * and the headline is derived from the same serial suggestions chain the "Today"
 * tile needs — so they resolve together. The serial getFreeBusy → buildDailySuggestions
 * dependency stays here as one unit; it is a genuine data dependency, not parallelizable.
 */
export async function DashboardSection({ userId }: { userId: string }): Promise<ReactElement> {
  const [
    people,
    events,
    dueReachOuts,
    openFollowUps,
    quietContacts,
    newSignals,
    suggestedClusters,
    calendarConnected,
    prefs,
    pendingSuggestions,
    nodeTypes,
  ] = await Promise.all([
    listContacts(undefined, undefined, HOME_PREVIEW_LIMIT),
    listEvents(HOME_PREVIEW_LIMIT),
    listDueReachOuts(),
    listAllOpenFollowUps(),
    listQuietContacts(),
    listNewSignals(),
    getSuggestedClusters(),
    hasCalendarConnection(),
    getSchedulePrefs(),
    listPendingEdgeSuggestions(),
    getCachedNodeTypes(userId),
  ]);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + WEEK_MS);
  const busy = calendarConnected ? await getFreeBusy({ from: now, to: weekAhead }) : [];
  const { suggestions } = await buildDailySuggestions({ date: now, prefs, busy });
  const slots = calendarConnected
    ? findOpenSlots({
        range: { from: now, to: weekAhead },
        busy,
        durationMinutes: DEFAULT_MEETING_DURATION_MINUTES,
        workingHours: { startHour: prefs.startHour, endHour: prefs.endHour },
        utcOffsetMinutes: prefs.utcOffsetMinutes,
        maxSlots: 3,
        now,
      })
    : [];
  const meetingCountToday = dayLoad({ day: now, busy, utcOffsetMinutes: prefs.utcOffsetMinutes }).meetingCount;
  const shownDue = suggestions.filter((item) => item.bucket !== "graph").length;

  // Daily-briefing headline: Home greets you with your day, built from data
  // already on this page — never a bare "Home" label.
  const headline =
    people.length === 0
      ? "Thread your first contact"
      : suggestions.length > 0
        ? `${suggestions.length} ${suggestions.length === 1 ? "thread" : "threads"} to pull today`
        : openFollowUps.length > 0
          ? `${openFollowUps.length} open follow-up${openFollowUps.length === 1 ? "" : "s"} to close`
          : "All caught up";
  const statusParts = [
    suggestions.length > 0 ? `${suggestions.length} due` : null,
    openFollowUps.length > 0 ? `${openFollowUps.length} follow-up${openFollowUps.length === 1 ? "" : "s"}` : null,
    newSignals.length > 0 ? `${newSignals.length} signal${newSignals.length === 1 ? "" : "s"}` : null,
    quietContacts.length > 0 ? `${quietContacts.length} going quiet` : null,
  ].filter((part): part is string => part !== null);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ember">{formatDayline(now)}</p>
          <h1 className="mt-1 font-display text-2xl tracking-tight">{headline}</h1>
          {statusParts.length > 0 ? <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-fog">{statusParts.join(" · ")}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/docs" />} variant="ghost" size="sm">Docs</Button>
          <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add manually</Button>
        </div>
      </div>

      <HomeDashboard
        people={people}
        events={events}
        suggestions={suggestions}
        calendarConnected={calendarConnected}
        slots={slots}
        overloaded={meetingCountToday >= prefs.overloadThreshold}
        meetingCountToday={meetingCountToday}
        moreDue={Math.max(0, dueReachOuts.length - shownDue)}
        openFollowUps={openFollowUps}
        quietContacts={quietContacts}
        newSignals={newSignals}
        inbox={<RelationshipInbox suggestions={pendingSuggestions} nodeTypes={nodeTypes.map(({ id, name, slug }) => ({ id, name, slug }))} />}
        groups={suggestedClusters.length > 0 ? (
          <HomeTile title="Suggested groups">
            <SuggestionsPanel clusters={suggestedClusters} />
          </HomeTile>
        ) : null}
      />
    </>
  );
}
