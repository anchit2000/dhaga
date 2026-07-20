import Link from "next/link";
import { CreateEventForm } from "@/components/app/CreateEventForm";
import { EventBadge } from "@/components/app/EventBadge";
import { HomeTile } from "@/components/app/home/HomeTile";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import { formatDate } from "@/utils/format-date";
import type { EventListItem } from "@/lib/repo/events";

/** Home's "Recent events" tile — paired with "Suggested groups" in its own row
 *  below the bento (side-by-side on wide screens, stacked on mobile). */
export function RecentEventsTile({
  events,
  className,
}: {
  events: EventListItem[];
  className?: string;
}): React.ReactElement {
  return (
    <HomeTile title="Recent events" className={className}>
      <div className="space-y-1">
        <div className="pb-1"><CreateEventForm compact /></div>
        {events.length === 0 ? (
          <p className="py-4 text-sm text-fog">Group people by an event, trip, or community.</p>
        ) : (
          events.slice(0, HOME_PREVIEW_LIMIT).map((event) => (
            <Link
              key={event.id}
              href={`/app/events/${event.id}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-wash/[0.04]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <EventBadge name={event.name} emoji={event.emoji} color={event.color} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-paper">{event.name}</span>
                  <span className="block text-xs text-fog">{formatDate(event.startedAt)}</span>
                </span>
              </span>
              <span className="shrink-0 text-xs text-fog">
                {event.contactCount} {event.contactCount === 1 ? "person" : "people"}
              </span>
            </Link>
          ))
        )}
      </div>
      <Link href="/app/events" className="mt-auto inline-flex min-h-11 items-center text-xs text-ember hover:underline">
        View all events
      </Link>
    </HomeTile>
  );
}
