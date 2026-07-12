import type { NoteRow } from "@/lib/db/schema";

interface TimelineEvent {
  at: Date;
  label: string;
  detail?: string;
}

/** v1.3: the relationship over time — captures, events, notes, touches. */
export function Timeline({
  createdAt,
  source,
  lastReachedOutAt,
  events,
  notes,
}: {
  createdAt: Date;
  source: string;
  lastReachedOutAt: Date | null;
  events: { id: string; name: string; scannedAt: Date }[];
  notes: NoteRow[];
}) {
  const timelineEvents: TimelineEvent[] = [
    {
      at: createdAt,
      label: source === "quick_add" ? "Captured via quick add" : "Added manually",
    },
    ...events.map((event) => ({
      at: event.scannedAt,
      label: `Met at ${event.name}`,
    })),
    ...notes.map((note) => ({
      at: note.createdAt,
      label: note.kind === "capture_source" ? "Capture source saved" : "Note added",
      detail: note.body.length > 90 ? `${note.body.slice(0, 90)}…` : note.body,
    })),
    ...(lastReachedOutAt
      ? [{ at: lastReachedOutAt, label: "You reached out" }]
      : []),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Timeline</h2>
      <ol className="relative space-y-0 border-l border-seam pl-4">
        {timelineEvents.map((event, index) => (
          <li key={index} className="relative pb-4 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[21px] top-1.5 size-2 rounded-full border border-amber/60 bg-ink"
            />
            <p className="text-sm text-paper">
              {event.label}
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-fog/60">
                {event.at.toLocaleDateString()}
              </span>
            </p>
            {event.detail ? (
              <p className="mt-0.5 truncate text-xs italic text-fog">
                {event.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
