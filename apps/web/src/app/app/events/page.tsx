import Link from "next/link";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listEvents } from "@/lib/repo/events";
import { CreateEventForm } from "@/components/app/CreateEventForm";
import { EmptyState } from "@/components/app/EmptyState";

export const metadata = { title: "Events — Dhaga" };

export default async function EventsPage() {
  await requireUserIdForPage();
  const events = await listEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-fog">
          One event per event — the people you met there stay grouped.
        </p>
      </div>

      <CreateEventForm />

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          body="Create one above, or attach a event while quick-adding a person."
        />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/app/events/${event.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-paper/[0.03]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-paper">
                    {event.name}
                  </span>
                  <span className="block text-xs text-fog">
                    {event.startedAt.toLocaleDateString()}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-seam bg-paper/[0.04] px-2.5 py-0.5 text-xs text-fog">
                  {event.contactCount}{" "}
                  {event.contactCount === 1 ? "person" : "people"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
