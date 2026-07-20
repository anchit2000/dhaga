"use client";

import { useState } from "react";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { GoingQuiet } from "./GoingQuiet";
import { HomeActions } from "./HomeActions";
import { HomeOverview } from "./HomeOverview";
import { RecentEventsTile } from "./RecentEventsTile";
import { SignalsFeed } from "./SignalsFeed";
import { TodaySuggestions, type MeetingSlot } from "./TodaySuggestions";
import type { ReactNode } from "react";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { EventListItem } from "@/lib/repo/events";
import type { listAllOpenFollowUps } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { QuietContact } from "@/lib/repo/strength";

/**
 * How many grid tracks "Recent people" (the bento's final tile now that events
 * moved out) spans, keyed by how many alert tiles (signals, going quiet)
 * rendered. Literal class strings so Tailwind sees them: with two alert tiles
 * people lands alone on the last row and stretches to close it; with fewer it
 * already sits beside Today/an alert tile, so it stays a 1×1 tile.
 */
const PEOPLE_TILE_SPAN: Record<number, string> = {
  0: "",
  1: "",
  2: "sm:col-span-2 xl:col-span-3",
};

/**
 * Home's bento grid plus the one contact detail Sheet all tiles share.
 * "Today" (the curated N-people-to-reach-out-to list) is the canonical
 * reach-out surface and the hero tile. Server-rendered sections that belong
 * in the grid (relationship inbox, suggested groups) come in as slots so the
 * grid template lives in one place; alert tiles (signals, going quiet)
 * render null when empty and the grid backfills their cell.
 */
export function HomeDashboard({
  people,
  events,
  suggestions,
  calendarConnected,
  slots,
  overloaded,
  meetingCountToday,
  moreDue,
  openFollowUps,
  quietContacts,
  newSignals,
  inbox,
  groups,
}: {
  people: ContactListItem[];
  events: EventListItem[];
  suggestions: DailySuggestion[];
  calendarConnected: boolean;
  slots: MeetingSlot[];
  overloaded: boolean;
  meetingCountToday: number;
  moreDue: number;
  openFollowUps: Awaited<ReturnType<typeof listAllOpenFollowUps>>;
  quietContacts: QuietContact[];
  newSignals: SignalItem[];
  inbox?: ReactNode;
  groups?: ReactNode;
}) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // The alert tiles (signals, going quiet) render nothing when empty, which
  // would leave "Recent people" alone on the last bento row with dead space
  // beside it — let it absorb the freed tracks so the grid always closes.
  const alertTiles = (newSignals.length > 0 ? 1 : 0) + (quietContacts.length > 0 ? 1 : 0);
  const peopleTileSpan = PEOPLE_TILE_SPAN[alertTiles];

  return (
    <>
      <div className="space-y-4">
        <div className="dhaga-bento grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
          {inbox}
          <TodaySuggestions
            suggestions={suggestions}
            calendarConnected={calendarConnected}
            slots={slots}
            overloaded={overloaded}
            meetingCountToday={meetingCountToday}
            moreDue={moreDue}
            onSelectContact={setSelectedContactId}
          />
          <HomeActions openFollowUps={openFollowUps} onSelectContact={setSelectedContactId} />
          <SignalsFeed signals={newSignals} onSelectContact={setSelectedContactId} />
          <GoingQuiet contacts={quietContacts} onSelectContact={setSelectedContactId} />
          <HomeOverview people={people} className={peopleTileSpan} onSelectContact={setSelectedContactId} />
        </div>
        {/* Recent events + Suggested groups share a row on wide screens, stack on mobile. */}
        <div className="dhaga-bento grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RecentEventsTile events={events} className={groups ? undefined : "lg:col-span-2"} />
          {groups}
        </div>
      </div>
      <ContactDetailSheet
        contactId={selectedContactId}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
      />
    </>
  );
}
