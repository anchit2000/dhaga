"use client";

import { useState } from "react";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { GoingQuiet } from "./GoingQuiet";
import { HomeActions } from "./HomeActions";
import { HomeEmptyState } from "./HomeEmptyState";
import { HomeOverview } from "./HomeOverview";
import { RecentEventsTile } from "./RecentEventsTile";
import { SignalsFeed } from "./SignalsFeed";
import { StarredTile } from "./StarredTile";
import { TodaySuggestions, type MeetingSlot } from "./TodaySuggestions";
import type { ReactElement, ReactNode } from "react";
import type { ContactListItem, RecentContactListItem } from "@/lib/repo/contacts";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { EventListItem } from "@/lib/repo/events";
import type { listAllOpenFollowUps } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { QuietContact } from "@/lib/repo/strength";

/**
 * Home's adaptive dashboard plus the one contact detail Sheet the action tiles
 * share. A brand-new account (no people) gets a calm welcome instead of an empty
 * grid. Otherwise every tile flows into a single masonry (CSS columns): each
 * keeps its natural height and packs top-to-bottom per column, so a short tile
 * never leaves a tall gap beside a taller neighbour — no dead space at any width
 * (an `items-start` grid can't do this; its row still sizes to the tallest tile).
 * Data-less tiles (confirmations, signals, going-quiet, starred, suggested
 * groups) are omitted entirely and the rest re-flow to close the layout. Order
 * is priority-first: Today, attention alerts, then the standing tiles.
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
  starred,
  hasConfirmations,
  inbox,
  groups,
}: {
  people: RecentContactListItem[];
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
  starred: ContactListItem[];
  hasConfirmations: boolean;
  inbox?: ReactNode;
  groups?: ReactNode;
}): ReactElement {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  if (people.length === 0) {
    return <HomeEmptyState />;
  }

  // Ordered, priority-first tile list. Alert/preview tiles are included only
  // when they have data, so no empty tile — and therefore no empty masonry
  // cell — is ever rendered.
  const tiles: Array<{ key: string; node: ReactNode }> = [
    {
      key: "today",
      node: (
        <TodaySuggestions
          suggestions={suggestions}
          calendarConnected={calendarConnected}
          slots={slots}
          overloaded={overloaded}
          meetingCountToday={meetingCountToday}
          moreDue={moreDue}
          onSelectContact={setSelectedContactId}
        />
      ),
    },
  ];
  if (hasConfirmations && inbox) tiles.push({ key: "inbox", node: inbox });
  if (newSignals.length > 0) {
    tiles.push({ key: "signals", node: <SignalsFeed signals={newSignals} onSelectContact={setSelectedContactId} /> });
  }
  if (quietContacts.length > 0) {
    tiles.push({ key: "quiet", node: <GoingQuiet contacts={quietContacts} onSelectContact={setSelectedContactId} /> });
  }
  tiles.push({ key: "followups", node: <HomeActions openFollowUps={openFollowUps} onSelectContact={setSelectedContactId} /> });
  if (starred.length > 0) tiles.push({ key: "starred", node: <StarredTile rows={starred} /> });
  tiles.push({ key: "people", node: <HomeOverview people={people} /> });
  tiles.push({ key: "events", node: <RecentEventsTile events={events} /> });
  if (groups) tiles.push({ key: "groups", node: groups });

  return (
    <>
      <div className="dhaga-bento columns-1 gap-4 sm:columns-2 xl:columns-3">
        {tiles.map(({ key, node }) => (
          <div key={key} className="mb-4 break-inside-avoid">
            {node}
          </div>
        ))}
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
