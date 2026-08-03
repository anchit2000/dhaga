import { ConfirmationsPreview } from "@/components/app/home/ConfirmationsPreview";
import { DashboardHeader } from "@/components/app/home/DashboardHeader";
import { HomeDashboard } from "@/components/app/home/HomeDashboard";
import { HomeTile } from "@/components/app/home/HomeTile";
import { SuggestionsPanel } from "@/components/app/import/SuggestionsPanel";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { loadDashboardData } from "./load";
import type { ReactElement } from "react";

/**
 * Home's header (daily-briefing headline) plus the bento dashboard. These share
 * one Suspense boundary because the interactive tiles all live inside the single
 * `HomeDashboard` client component (one CSS masonry + one shared ContactDetailSheet),
 * and the headline is derived from the same serial suggestions chain the "Today"
 * tile needs — so they resolve together. Streaming is a paint optimization only:
 * a Suspense boundary does not shorten how long this request holds its tenant
 * connection (one request, released in after()), which is why the calendar
 * provider call was moved off the render entirely — see ./calendar.ts. Every
 * read lives in ./load.ts — read the connection-pressure note there before
 * adding one.
 */
export async function DashboardSection(): Promise<ReactElement> {
  const data = await loadDashboardData();

  return (
    <>
      <DashboardHeader
        now={data.now}
        peopleCount={data.people.length}
        suggestionCount={data.suggestions.length}
        openFollowUpCount={data.openFollowUps.length}
        signalCount={data.newSignals.length}
        quietCount={data.quietContacts.length}
      />

      <HomeDashboard
        people={data.people}
        events={data.events}
        suggestions={data.suggestions}
        calendarConnected={data.calendarConnected}
        slots={data.slots}
        overloaded={data.overloaded}
        meetingCountToday={data.meetingCountToday}
        moreDue={data.moreDue}
        goalProgress={data.goalProgress}
        openFollowUps={data.openFollowUps}
        quietContacts={data.quietContacts}
        newSignals={data.newSignals}
        starred={data.starred}
        hasConfirmations={data.pendingConfirmations.length > 0}
        inbox={<ConfirmationsPreview confirmations={data.pendingConfirmations} />}
        groups={data.suggestedClusters.length > 0 ? (
          <HomeTile
            title="Suggested groups"
            viewAll={{
              href: "/app/groups",
              label: data.suggestedClusters.length > HOME_PREVIEW_LIMIT ? `+${data.suggestedClusters.length - HOME_PREVIEW_LIMIT} more groups` : "View all groups",
            }}
          >
            <SuggestionsPanel clusters={data.suggestedClusters.slice(0, HOME_PREVIEW_LIMIT)} />
          </HomeTile>
        ) : null}
      />
    </>
  );
}

// Import paths stay stable via this barrel: @/components/app/home/DashboardSection.
export { loadDashboardData } from "./load";
export type { DashboardData } from "./types";
