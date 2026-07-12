import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getEvent, listEventContacts, listEvents } from "@/lib/repo/events";
import { EmailDigestButton } from "@/components/app/EmailDigestButton";
import { EmptyState } from "@/components/app/EmptyState";
import { EventAdmin } from "@/components/app/EventAdmin";

export const metadata = { title: "Event — Dhaga" };

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserIdForPage();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const [people, allEvents] = await Promise.all([
    listEventContacts(id),
    listEvents(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{event.name}</h1>
        <p className="mt-1 text-sm text-fog">
          Started {event.startedAt.toLocaleDateString()} · {people.length}{" "}
          {people.length === 1 ? "person" : "people"}
        </p>
      </div>

      {people.length > 0 ? <EmailDigestButton eventId={id} /> : null}

      <EventAdmin
        eventId={id}
        name={event.name}
        otherEvents={allEvents
          .filter((other) => other.id !== id)
          .map(({ id: otherId, name }) => ({ id: otherId, name }))}
      />

      {people.length === 0 ? (
        <EmptyState
          title="Nobody here yet"
          body="Quick-add a person and attach this event to them."
        />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/app/people/${person.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper/[0.03]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-sm text-amber">
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-paper">
                    {person.name}
                  </span>
                  <span className="block truncate text-xs text-fog">
                    {person.title ?? "—"}
                  </span>
                </span>
                <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog/60 sm:block">
                  {person.scannedAt.toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
