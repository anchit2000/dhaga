import { dayLoad, findOpenSlots } from "@dhaga/core";
import { ConfirmationsPreview } from "@/components/app/home/ConfirmationsPreview";
import { DashboardHeader } from "@/components/app/home/DashboardHeader";
import { HomeDashboard } from "@/components/app/home/HomeDashboard";
import { HomeTile } from "@/components/app/home/HomeTile";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";
import { getFreeBusy, hasCalendarConnection } from "@/lib/repo/calendar";
import { listPendingConfirmations } from "@/lib/repo/confirmations";
import { listContacts, listContactsPage } from "@/lib/repo/contacts";
import { buildDailySuggestions, CADENCE_BUCKETS } from "@/lib/repo/daily-suggestions";
import { listEvents } from "@/lib/repo/events";
import { getActiveGoalProgress } from "@/lib/repo/goals";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listNewSignals } from "@/lib/repo/signals";
import { listQuietContacts } from "@/lib/repo/strength";
import { getSuggestedClusters } from "@/lib/repo/suggestions";
import { getSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { DEFAULT_MEETING_DURATION_MINUTES } from "@/utils/constants/suggestions";
import type { ReactElement } from "react";

const WEEK_MS = 7 * 86_400_000;

/**
 * Home's header (daily-briefing headline) plus the bento dashboard. These share
 * one Suspense boundary because the interactive tiles all live inside the single
 * `HomeDashboard` client component (one CSS masonry + one shared ContactDetailSheet),
 * and the headline is derived from the same serial suggestions chain the "Today"
 * tile needs — so they resolve together. The serial getFreeBusy → buildDailySuggestions
 * dependency stays here as one unit; it is a genuine data dependency, not parallelizable.
 */
export async function DashboardSection(): Promise<ReactElement> {
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
    pendingConfirmations,
    starredFavourites,
    goalProgress,
  ] = await Promise.all([
    // Recent people is a tile Dhaga volunteers, so it draws from the
    // surfaceable set only (last arg) — no mention stubs, no service rows.
    listContacts(undefined, undefined, HOME_PREVIEW_LIMIT, true),
    listEvents(HOME_PREVIEW_LIMIT),
    listDueReachOuts(),
    listAllOpenFollowUps(),
    listQuietContacts(),
    listNewSignals(),
    getSuggestedClusters(),
    hasCalendarConnection(),
    getSchedulePrefs(),
    listPendingConfirmations(),
    listContactsPage({ page: 1, pageSize: HOME_PREVIEW_LIMIT, starred: true }),
    // Joins the existing fan-out rather than adding a 12th sequential await —
    // consistency with the block above; the pool hazard it inherits is
    // pre-existing and tracked separately.
    getActiveGoalProgress(),
  ]);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + WEEK_MS);
  const busy = calendarConnected ? await getFreeBusy({ from: now, to: weekAhead }) : [];
  // due/followUps/signals are already in hand above — injecting them is what
  // stops the engine re-running those three queries on every render.
  const { suggestions } = await buildDailySuggestions({
    date: now,
    prefs,
    busy,
    due: dueReachOuts,
    followUps: openFollowUps,
    signals: newSignals,
  });
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
  // Count the buckets that MEAN "due", not "everything but graph": that negation
  // counted signal/quiet/date rows as due and under-reported the footer.
  const shownDue = suggestions.filter((item) => CADENCE_BUCKETS.has(item.bucket)).length;

  return (
    <>
      <DashboardHeader
        now={now}
        peopleCount={people.length}
        suggestionCount={suggestions.length}
        openFollowUpCount={openFollowUps.length}
        signalCount={newSignals.length}
        quietCount={quietContacts.length}
      />

      <HomeDashboard
        people={people}
        events={events}
        suggestions={suggestions}
        calendarConnected={calendarConnected}
        slots={slots}
        overloaded={meetingCountToday >= prefs.overloadThreshold}
        meetingCountToday={meetingCountToday}
        moreDue={Math.max(0, dueReachOuts.length - shownDue)}
        goalProgress={goalProgress}
        openFollowUps={openFollowUps}
        quietContacts={quietContacts}
        newSignals={newSignals}
        starred={starredFavourites.rows}
        hasConfirmations={pendingConfirmations.length > 0}
        inbox={<ConfirmationsPreview confirmations={pendingConfirmations} />}
        groups={suggestedClusters.length > 0 ? (
          <HomeTile
            title="Suggested groups"
            viewAll={{
              href: "/app/groups",
              label: suggestedClusters.length > HOME_PREVIEW_LIMIT ? `+${suggestedClusters.length - HOME_PREVIEW_LIMIT} more groups` : "View all groups",
            }}
          >
            <SuggestionsPanel clusters={suggestedClusters.slice(0, HOME_PREVIEW_LIMIT)} />
          </HomeTile>
        ) : null}
      />
    </>
  );
}
