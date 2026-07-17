"use client";

import { useState } from "react";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { GoingQuiet } from "./GoingQuiet";
import { HomeActions } from "./HomeActions";
import { HomeOverview } from "./HomeOverview";
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

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
        <HomeOverview people={people} events={events} onSelectContact={setSelectedContactId} />
        {groups}
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
