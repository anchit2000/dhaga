import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getEvent, listEventContacts, listEvents } from "@/lib/repo/events";
import { EmailDigestButton } from "@/components/app/EmailDigestButton";
import { EventAdmin } from "@/components/app/EventAdmin";
import { EventBadge } from "@/components/app/EventBadge";
import { EventPeople } from "@/components/app/EventPeople";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex items-start gap-3">
        <EventBadge name={event.name} emoji={event.emoji} color={event.color} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">{event.name}</h1>
          <p className="mt-1 text-sm text-fog">
            Started {event.startedAt.toLocaleDateString()} · {people.length}{" "}
            {people.length === 1 ? "person" : "people"}
          </p>
          {event.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="h-6">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {people.length > 0 ? <EmailDigestButton eventId={id} /> : null}

      <EventAdmin
        eventId={id}
        name={event.name}
        emoji={event.emoji}
        color={event.color}
        tags={event.tags}
        otherEvents={allEvents
          .filter((other) => other.id !== id)
          .map(({ id: otherId, name }) => ({ id: otherId, name }))}
      />

      <EventPeople eventId={id} people={people} />
    </div>
  );
}
