import { hasCalendarConnection } from "@/lib/repo/calendar";
import { listPendingConfirmations } from "@/lib/repo/confirmations";
import { listContacts, listContactsPage } from "@/lib/repo/contacts";
import { buildDailySuggestions, CADENCE_BUCKETS } from "@/lib/repo/daily-suggestions";
import { listEvents } from "@/lib/repo/events";
import { getActiveGoalProgress, loadActiveGoalCohort } from "@/lib/repo/goals";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listNewSignals } from "@/lib/repo/signals";
import { listQuietContacts } from "@/lib/repo/strength";
import { getSuggestedClusters } from "@/lib/repo/suggestions";
import { getSuggestionSettings } from "@/lib/repo/suggestion-settings";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { loadCalendarView } from "./calendar";
import type { DashboardData } from "./types";

const WEEK_MS = 7 * 86_400_000;

/**
 * Everything the Home dashboard renders, in one read — kept apart from the
 * markup (./index.tsx) so this data path is a unit a budget can be held against
 * (see lib/__tests__/home-connection-pressure.test.ts).
 *
 * CONNECTION PRESSURE — the reason this file reads the way it does. The
 * `Promise.all` below is NOT a `getDb()` fan-out: an RSC render pins ONE tenant
 * connection for the whole request (React-`cache()`d in lib/db/request-scope.ts),
 * so every read here resolves to that same client and node-postgres runs them
 * one at a time on it. A read's cost is therefore a SERIAL round-trip that
 * lengthens how long this request holds one of the max-3 tenant-pool slots — so
 * the cure for pressure is FEWER round-trips, not more concurrency. Hence the
 * two collapses, in the shape lib/repo/search already uses:
 *   - ONE batched settings query (getSuggestionSettings) in place of the five
 *     single-key `select value from settings where key = $1` reads Home used to
 *     issue — see lib/repo/settings/kv.ts; and
 *   - ONE goal + cohort load, injected into BOTH the burn-down strip and the
 *     suggestion engine's daily slice, in place of that four-table join running
 *     twice per render — see lib/repo/goals/cohort.ts.
 * Anything added here must obey the same rule: reuse what is already in hand,
 * never re-read it — and never make an outbound call from here at all: the
 * pinned connection is held for the whole render, so a third party's latency
 * becomes a tenant-pool slot held for exactly that long (./calendar.ts).
 */
export async function loadDashboardData(): Promise<DashboardData> {
  const [
    people,
    events,
    dueReachOuts,
    openFollowUps,
    quietContacts,
    newSignals,
    suggestedClusters,
    calendarConnected,
    settings,
    pendingConfirmations,
    starredFavourites,
    goalCohort,
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
    // ONE query for schedule prefs + suggestion count + important-date lead
    // days; the last two are injected into buildDailySuggestions below.
    getSuggestionSettings(),
    listPendingConfirmations(),
    listContactsPage({ page: 1, pageSize: HOME_PREVIEW_LIMIT, starred: true }),
    // The goal + its cohort, read once. Both the burn-down strip and the
    // suggestion engine's daily slice derive from this same bundle.
    loadActiveGoalCohort(),
  ]);
  const { prefs } = settings;
  // Derived from the bundle already in hand — no second goal/cohort read.
  const goalProgress = await getActiveGoalProgress(goalCohort);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + WEEK_MS);
  // Every calendar-derived value, from the STORED free/busy snapshot — this
  // render never calls a provider, because it holds a tenant connection the
  // whole time it runs. Read ./calendar.ts before changing that.
  const calendar = await loadCalendarView({ calendarConnected, now, weekAhead, prefs });
  // due/followUps/signals/count/leadDays/goalCohort are already in hand above —
  // injecting them is what stops the engine re-running those reads per render.
  const { suggestions } = await buildDailySuggestions({
    date: now,
    prefs,
    count: settings.count,
    leadDays: settings.leadDays,
    goalCohort,
    busy: calendar.busy,
    due: dueReachOuts,
    followUps: openFollowUps,
    signals: newSignals,
  });
  // Count the buckets that MEAN "due", not "everything but graph": that negation
  // counted signal/quiet/date rows as due and under-reported the footer.
  const shownDue = suggestions.filter((item) => CADENCE_BUCKETS.has(item.bucket)).length;

  return {
    people,
    events,
    suggestions,
    calendarConnected,
    slots: calendar.slots,
    overloaded: calendar.overloaded,
    meetingCountToday: calendar.meetingCountToday,
    moreDue: Math.max(0, dueReachOuts.length - shownDue),
    goalProgress,
    openFollowUps,
    quietContacts,
    newSignals,
    starred: starredFavourites.rows,
    pendingConfirmations,
    suggestedClusters,
    dueReachOuts,
    now,
  };
}
