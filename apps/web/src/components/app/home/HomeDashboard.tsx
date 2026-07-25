"use client";

import { Fragment, useState } from "react";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { GoingQuiet } from "./GoingQuiet";
import { HomeActions } from "./HomeActions";
import { HomeEmptyState } from "./HomeEmptyState";
import { HomeOverview } from "./HomeOverview";
import { RecentEventsTile } from "./RecentEventsTile";
import { SignalsFeed } from "./SignalsFeed";
import { TodaySuggestions, type MeetingSlot } from "./TodaySuggestions";
import type { ReactElement, ReactNode } from "react";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { EventListItem } from "@/lib/repo/events";
import type { listAllOpenFollowUps } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { QuietContact } from "@/lib/repo/strength";

/**
 * Home's adaptive dashboard plus the one contact detail Sheet all tiles share.
 * A brand-new account (no people) gets a calm welcome instead of an empty grid.
 * Otherwise two zones auto-size to how much a user has:
 *  - Zone 1 — "Today" (the canonical reach-out hero) beside an attention rail
 *    (confirmations, signals, going-quiet). The rail is built from the data
 *    props so an all-empty rail lets Today span the full width — no dead column.
 *  - Zone 2 — an auto-fit grid of the standing tiles (follow-ups, recent people,
 *    recent events, suggested groups); empty tiles drop out and the rest re-fill.
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
  hasConfirmations,
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
  hasConfirmations: boolean;
  inbox?: ReactNode;
  groups?: ReactNode;
}): ReactElement {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  if (people.length === 0) {
    return <HomeEmptyState />;
  }

  // Attention rail, priority order. Each tile renders null when its data is
  // empty, so presence is derived from the data props (not rendered children):
  // an empty rail lets Today take the full width with no empty column.
  const rail: ReactNode[] = [];
  if (hasConfirmations && inbox) rail.push(<Fragment key="inbox">{inbox}</Fragment>);
  if (newSignals.length > 0) {
    rail.push(<SignalsFeed key="signals" signals={newSignals} onSelectContact={setSelectedContactId} />);
  }
  if (quietContacts.length > 0) {
    rail.push(<GoingQuiet key="quiet" contacts={quietContacts} onSelectContact={setSelectedContactId} />);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="dhaga-bento grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <TodaySuggestions
            suggestions={suggestions}
            calendarConnected={calendarConnected}
            slots={slots}
            overloaded={overloaded}
            meetingCountToday={meetingCountToday}
            moreDue={moreDue}
            onSelectContact={setSelectedContactId}
            className={rail.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}
          />
          {rail.length > 0 ? <div className="flex flex-col gap-4">{rail}</div> : null}
        </div>
        <div className="dhaga-bento grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <HomeActions openFollowUps={openFollowUps} onSelectContact={setSelectedContactId} />
          <HomeOverview people={people} onSelectContact={setSelectedContactId} />
          <RecentEventsTile events={events} />
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
