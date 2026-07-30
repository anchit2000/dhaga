"use client";

import { HomeTile } from "./HomeTile";
import { Button } from "@/components/ui/button";
import { markReachedOutAction } from "@/lib/actions/reminders";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { QUIET_FEED_LIMIT } from "@/utils/constants/app";
import type { QuietContact } from "@/lib/repo/strength";

function monthsAgo(date: Date): string {
  const months = Math.floor((Date.now() - date.getTime()) / (30 * 86_400_000));
  return months <= 1 ? "over a month ago" : `${months} months ago`;
}

/**
 * Decayed relationships (no touch in ~8 months, no cadence set), strongest
 * first. Renders nothing while nobody is fading — this is an alert feed, not
 * a fixture.
 */
export function GoingQuiet({
  contacts,
  onSelectContact,
}: {
  contacts: QuietContact[];
  onSelectContact: (id: string) => void;
}) {
  // Marking someone reached out drops them from the fading feed instantly; the
  // row returns with a Retry toast if the server rejects it.
  const { items, remove } = useOptimisticList<QuietContact>({
    items: contacts,
    errorMessage: "Couldn't mark that as reached out.",
  });
  if (items.length === 0) return null;
  const shown = items.slice(0, QUIET_FEED_LIMIT);
  const overflow = items.length - shown.length;

  return (
    <HomeTile
      title="Going quiet"
      viewAll={{ href: "/app/people", label: overflow > 0 ? `+${overflow} more quietly fading` : "View all people" }}
      meta={
        <span className="font-mono text-[10px] uppercase tracking-widest text-fog">
          {contacts.length} fading
        </span>
      }
    >
      <ul className="divide-y divide-seam">
        {shown.map((person) => (
          <li
            key={person.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0"
          >
            <Button
              render={<div />}
              variant="ghost"
              onClick={() => onSelectContact(person.id)}
              className="block h-auto min-w-0 flex-1 rounded-lg p-0 text-left text-sm font-normal normal-case hover:bg-transparent"
            >
              <span className="block truncate text-sm font-medium text-paper">
                {person.name}
              </span>
              <span className="block truncate text-xs text-fog">
                {[person.title, person.companyName].filter(Boolean).join(" · ") ||
                  "—"}{" "}
                · last touch {monthsAgo(person.lastTouch)}
              </span>
            </Button>
            <span className="shrink-0 rounded-full border border-seam px-2 py-0.5 text-[11px] text-fog">
              {person.strength.label} · {person.strength.score}
            </span>
            <button
              type="button"
              onClick={() =>
                remove(person, async () => {
                  const formData = new FormData();
                  formData.set("contactId", person.id);
                  await markReachedOutAction(formData);
                  return null;
                })
              }
              className="shrink-0 rounded-full border border-amber/40 px-3 py-1.5 text-xs text-ember transition-colors hover:bg-amber/10"
            >
              I reached out ✓
            </button>
          </li>
        ))}
      </ul>
    </HomeTile>
  );
}
