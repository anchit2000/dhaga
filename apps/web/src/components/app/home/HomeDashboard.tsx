"use client";

import { useState } from "react";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { GoingQuiet } from "./GoingQuiet";
import { HomeActions } from "./HomeActions";
import { HomeOverview } from "./HomeOverview";
import { SignalsFeed } from "./SignalsFeed";
import { TodaySuggestions, type MeetingSlot } from "./TodaySuggestions";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { EventListItem } from "@/lib/repo/events";
import type { listAllOpenFollowUps } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { QuietContact } from "@/lib/repo/strength";

/**
 * Home's sections plus the one contact detail Sheet they all share. "Today" (the
 * curated N-people-to-reach-out-to list) is the canonical reach-out surface, so
 * the old unbounded "Reach out" list is retired — HomeActions now only renders
 * open follow-ups, and only when there are any.
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
}) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  return (
    <>
      <section className="space-y-5">
        <h2 className="font-display text-lg">Updates</h2>
        <TodaySuggestions
          suggestions={suggestions}
          calendarConnected={calendarConnected}
          slots={slots}
          overloaded={overloaded}
          meetingCountToday={meetingCountToday}
          moreDue={moreDue}
          onSelectContact={setSelectedContactId}
        />
        {openFollowUps.length > 0 ? (
          <HomeActions dueReachOuts={[]} openFollowUps={openFollowUps} onSelectContact={setSelectedContactId} />
        ) : null}
        <SignalsFeed signals={newSignals} onSelectContact={setSelectedContactId} />
        <GoingQuiet contacts={quietContacts} onSelectContact={setSelectedContactId} />
      </section>
      <HomeOverview people={people} events={events} onSelectContact={setSelectedContactId} />
      <ContactDetailSheet
        contactId={selectedContactId}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
      />
    </>
  );
}
