"use client";

import Link from "next/link";
import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { AttachTargetSearch } from "@/components/app/AttachTargetSearch";
import { EmptyState } from "@/components/app/EmptyState";
import { toastError } from "@/components/app/feedback";
import { Button } from "@/components/ui/button";
import {
  attachContactToEventAction,
  detachContactFromEventAction,
} from "@/lib/actions/event-membership";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import type { GraphTarget } from "@/lib/repo/graph-data";

export interface EventPerson {
  id: string;
  name: string;
  title: string | null;
  scannedAt: Date;
}

/**
 * Event-page roster: search existing people to attach (several in a row) and
 * detach anyone with the × affordance. Detach is optimistic — the row vanishes
 * instantly (useOptimisticList) and rolls back with a Retry toast if the write
 * fails. Attach comes from a search (no full row data yet), so it stays
 * resilient: await, then router.refresh() commits the server re-render.
 */
export function EventPeople({
  eventId,
  people,
}: {
  eventId: string;
  people: EventPerson[];
}): React.ReactElement {
  const router = useRouter();
  const [attachPending, startAttach] = useTransition();
  const roster = useOptimisticList<EventPerson>({
    items: people,
    errorMessage: "Couldn't remove them from this event — try again.",
  });
  const attachedIds = useMemo(
    () => new Set(roster.items.map((person) => person.id)),
    [roster.items],
  );

  function attach(target: GraphTarget): void {
    startAttach(async () => {
      const result = await attachContactToEventAction(eventId, target.id);
      if (result.error) {
        toastError(result.error, () => attach(target));
        return;
      }
      toast.success(`Added ${target.label} to this event.`);
      router.refresh();
    });
  }

  function detach(person: EventPerson): void {
    roster.remove(person, async () => {
      const result = await detachContactFromEventAction(eventId, person.id);
      if (result.error) return result.error;
      router.refresh();
      return null;
    });
  }

  return (
    <div className="space-y-4">
      <AttachTargetSearch
        kind="contact"
        excludeIds={attachedIds}
        onPick={attach}
        placeholder="Add people — search by name…"
        disabled={attachPending}
      />
      {roster.items.length === 0 ? (
        <EmptyState
          title="Nobody here yet"
          body="Search above to attach people you've already captured, or quick-add someone new."
        />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {roster.items.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Link
                href={`/app/people/${person.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-sm text-ember">
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
              </Link>
              <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog sm:block">
                {person.scannedAt.toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => detach(person)}
                aria-label={`Remove ${person.name} from this event`}
                title={`Remove ${person.name} from this event`}
                className="shrink-0 text-fog hover:text-paper"
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
