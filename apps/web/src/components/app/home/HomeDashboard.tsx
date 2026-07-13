"use client";

import { useState } from "react";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { GoingQuiet } from "./GoingQuiet";
import { HomeActions } from "./HomeActions";
import { HomeOverview } from "./HomeOverview";
import { SignalsFeed } from "./SignalsFeed";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { EventListItem } from "@/lib/repo/events";
import type { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { QuietContact } from "@/lib/repo/strength";

/**
 * Home's four data sections (Reach out/Open follow-ups, Signals, Going
 * quiet, Recent people/events) plus the one contact detail Sheet they all
 * share — a single piece of client state instead of one Sheet per section.
 */
export function HomeDashboard({
  people,
  events,
  dueReachOuts,
  openFollowUps,
  quietContacts,
  newSignals,
}: {
  people: ContactListItem[];
  events: EventListItem[];
  dueReachOuts: Awaited<ReturnType<typeof listDueReachOuts>>;
  openFollowUps: Awaited<ReturnType<typeof listAllOpenFollowUps>>;
  quietContacts: QuietContact[];
  newSignals: SignalItem[];
}) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  return (
    <>
      <section className="space-y-5">
        <h2 className="font-display text-lg">Updates</h2>
        <HomeActions
          dueReachOuts={dueReachOuts}
          openFollowUps={openFollowUps}
          onSelectContact={setSelectedContactId}
        />
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
