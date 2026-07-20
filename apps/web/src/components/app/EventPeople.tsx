"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { AttachTargetSearch } from "@/components/app/AttachTargetSearch";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import {
  attachContactToEventAction,
  detachContactFromEventAction,
} from "@/lib/actions/event-membership";
import type { GraphTarget } from "@/lib/repo/graph-data";

export interface EventPerson {
  id: string;
  name: string;
  title: string | null;
  scannedAt: Date;
}

/**
 * Event-page roster: search existing people to attach (several in a row) and
 * detach anyone with the × affordance. The server re-renders the list after
 * each mutation (revalidatePath); router.refresh() commits that immediately.
 */
export function EventPeople({
  eventId,
  people,
}: {
  eventId: string;
  people: EventPerson[];
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const attachedIds = useMemo(
    () => new Set(people.map((person) => person.id)),
    [people],
  );

  function attach(target: GraphTarget): void {
    setBusyId(target.id);
    startTransition(async () => {
      const result = await attachContactToEventAction(eventId, target.id);
      setBusyId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${target.label} to this event.`);
      router.refresh();
    });
  }

  function detach(contactId: string, name: string): void {
    setBusyId(contactId);
    startTransition(async () => {
      const result = await detachContactFromEventAction(eventId, contactId);
      setBusyId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed ${name} from this event.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <AttachTargetSearch
        kind="contact"
        excludeIds={attachedIds}
        onPick={attach}
        placeholder="Add people — search by name…"
        disabled={pending}
      />
      {people.length === 0 ? (
        <EmptyState
          title="Nobody here yet"
          body="Search above to attach people you've already captured, or quick-add someone new."
        />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Link
                href={`/app/people/${person.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
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
              </Link>
              <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog/60 sm:block">
                {person.scannedAt.toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => detach(person.id, person.name)}
                loading={pending && busyId === person.id}
                aria-label={`Remove ${person.name} from this event`}
                title={`Remove ${person.name} from this event`}
                className="shrink-0 text-fog/60 hover:text-paper"
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
