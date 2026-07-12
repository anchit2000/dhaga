import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateEventForm } from "@/components/app/CreateEventForm";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import type { ContactListItem } from "@/lib/repo/contacts";
import type { EventListItem } from "@/lib/repo/events";

export function HomeOverview({ people, events }: { people: ContactListItem[]; events: EventListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Recent people</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {people.length === 0 ? <p className="py-4 text-sm text-fog">Your newly captured people will appear here.</p> : people.slice(0, HOME_PREVIEW_LIMIT).map((person) => (
            <Link key={person.id} href={`/app/people/${person.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-paper/[0.04]">
              <span className="min-w-0"><span className="block truncate text-sm text-paper">{person.name}</span><span className="block truncate text-xs text-fog">{person.companyName || person.title || "No details yet"}</span></span>
              <ArrowRight className="size-3.5 shrink-0 text-fog/60" />
            </Link>
          ))}
          <Link href="/app/people" className="inline-flex min-h-11 items-center text-xs text-amber hover:underline">View all people</Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <div className="pb-3"><CreateEventForm /></div>
          {events.length === 0 ? <p className="py-4 text-sm text-fog">Group people by an event, trip, or community.</p> : events.slice(0, HOME_PREVIEW_LIMIT).map((event) => (
            <Link key={event.id} href={`/app/events/${event.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-paper/[0.04]">
              <span className="min-w-0"><span className="block truncate text-sm text-paper">{event.name}</span><span className="block text-xs text-fog">{event.startedAt.toLocaleDateString()}</span></span>
              <span className="text-xs text-fog">{event.contactCount} {event.contactCount === 1 ? "person" : "people"}</span>
            </Link>
          ))}
          <Link href="/app/events" className="inline-flex min-h-11 items-center text-xs text-amber hover:underline">View all events</Link>
        </CardContent>
      </Card>
    </div>
  );
}
