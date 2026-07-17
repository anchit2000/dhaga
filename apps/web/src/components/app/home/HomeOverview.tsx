"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CreateEventForm } from "@/components/app/CreateEventForm";
import { EventBadge } from "@/components/app/EventBadge";
import { HomeTile } from "@/components/app/home/HomeTile";
import { Button } from "@/components/ui/button";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { formatDate } from "@/utils/format-date";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { EventListItem } from "@/lib/repo/events";

/** Home's "Recent people" and "Recent events" bento tiles. */
export function HomeOverview({
  people,
  events,
  onSelectContact,
}: {
  people: ContactListItem[];
  events: EventListItem[];
  onSelectContact: (id: string) => void;
}) {
  return (
    <>
      <HomeTile title="Recent people">
        <div className="space-y-1">
          {people.length === 0 ? <p className="py-4 text-sm text-fog">Your newly captured people will appear here.</p> : people.slice(0, HOME_PREVIEW_LIMIT).map((person) => (
            <Button key={person.id} render={<div />} variant="ghost" onClick={() => onSelectContact(person.id)} className="flex h-auto min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-normal normal-case transition-colors hover:bg-wash/[0.04]">
              <span className="min-w-0"><span className="block truncate text-sm text-paper">{person.name}</span><span className="block truncate text-xs text-fog">{person.companyName || person.title || "No details yet"}</span></span>
              <ArrowRight className="size-3.5 shrink-0 text-fog/60" />
            </Button>
          ))}
        </div>
        <Link href="/app/people" className="mt-auto inline-flex min-h-11 items-center text-xs text-ember hover:underline">View all people</Link>
      </HomeTile>
      <HomeTile title="Recent events">
        <div className="space-y-1">
          <div className="pb-1"><CreateEventForm /></div>
          {events.length === 0 ? <p className="py-4 text-sm text-fog">Group people by an event, trip, or community.</p> : events.slice(0, HOME_PREVIEW_LIMIT).map((event) => (
            <Link key={event.id} href={`/app/events/${event.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-wash/[0.04]">
              <span className="flex min-w-0 items-center gap-2.5">
                <EventBadge name={event.name} emoji={event.emoji} color={event.color} size="sm" />
                <span className="min-w-0"><span className="block truncate text-sm text-paper">{event.name}</span><span className="block text-xs text-fog">{formatDate(event.startedAt)}</span></span>
              </span>
              <span className="shrink-0 text-xs text-fog">{event.contactCount} {event.contactCount === 1 ? "person" : "people"}</span>
            </Link>
          ))}
        </div>
        <Link href="/app/events" className="mt-auto inline-flex min-h-11 items-center text-xs text-ember hover:underline">View all events</Link>
      </HomeTile>
    </>
  );
}
