import Link from "next/link";
import { dayLoad, findOpenSlots, hasLLM } from "@dhaga/core";
import { HomeDashboard } from "@/components/app/home/HomeDashboard";
import { RelationshipInbox } from "@/components/app/relationships/RelationshipInbox";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";
import { OnboardingTour } from "@/components/app/onboarding";
import { QuickAddForm } from "@/components/app/QuickAddForm";
import { Button } from "@/components/ui/button";
import { activeEventId } from "@/lib/active-event";
import { aiActionsUsedThisMonth, monthlyAiCap } from "@/lib/ai/metering";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getFreeBusy, hasCalendarConnection } from "@/lib/repo/calendar";
import { listContacts } from "@/lib/repo/contacts";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listEvents } from "@/lib/repo/events";
import { hasSeenOnboardingTour, shouldStoreCardPhotos } from "@/lib/repo/settings";
import { getSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { listNewSignals } from "@/lib/repo/signals";
import { listQuietContacts } from "@/lib/repo/strength";
import { getSuggestedClusters } from "@/lib/repo/suggestions";
import { listPendingEdgeSuggestions } from "@/lib/repo/edge-suggestions";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { DEFAULT_MEETING_DURATION_MINUTES } from "@/utils/constants/suggestions";

export const metadata = { title: "Home — Dhaga" };

const WEEK_MS = 7 * 86_400_000;

export default async function HomePage() {
  await requireUserIdForPage();
  const llmEnabled = hasLLM();
  const [people, events, dueReachOuts, openFollowUps, quietContacts, newSignals, used, storeCardPhotos, suggestedClusters, calendarConnected, prefs, seenTour, pendingSuggestions] =
    await Promise.all([
      listContacts(undefined, undefined, HOME_PREVIEW_LIMIT), listEvents(HOME_PREVIEW_LIMIT), listDueReachOuts(), listAllOpenFollowUps(),
      listQuietContacts(), listNewSignals(), llmEnabled ? aiActionsUsedThisMonth() : Promise.resolve(0),
      shouldStoreCardPhotos(), getSuggestedClusters(), hasCalendarConnection(), getSchedulePrefs(), hasSeenOnboardingTour(),
      listPendingEdgeSuggestions(),
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

  return <div className="space-y-8 pb-16">
    <OnboardingTour autoStart={!seenTour} />
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-mono text-[10px] uppercase tracking-widest text-ember">Your network, threaded</p><h1 className="mt-1 font-display text-2xl tracking-tight">Home</h1></div>
      <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add manually</Button>
    </div>

    <RelationshipInbox suggestions={pendingSuggestions} />

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
    />

    {suggestedClusters.length > 0 ? (
      <section className="space-y-3">
        <h2 className="font-display text-lg">Suggested groups</h2>
        <SuggestionsPanel clusters={suggestedClusters} />
      </section>
    ) : null}

    <QuickAddForm events={events.map(({ id, name }) => ({ id, name }))} defaultEventId={activeEventId(events)} storeCardPhotos={storeCardPhotos} homeDock aiUsage={llmEnabled ? `${used} of ${monthlyAiCap()} AI actions used` : undefined} />
  </div>;
}
