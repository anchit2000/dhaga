"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { markReachedOutAction } from "@/lib/actions/reminders";
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
  if (contacts.length === 0) return null;
  const shown = contacts.slice(0, QUIET_FEED_LIMIT);
  const overflow = contacts.length - shown.length;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">Going quiet</h2>
      <ul className="space-y-1.5">
        {shown.map((person) => (
          <li
            key={person.id}
            className="flex items-center gap-3 rounded-xl border border-seam bg-panel px-3 py-2.5"
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
            <form action={markReachedOutAction} className="shrink-0">
              <input type="hidden" name="contactId" value={person.id} />
              <button
                type="submit"
                className="rounded-full border border-amber/40 px-3 py-1.5 text-xs text-amber transition-colors hover:bg-amber/10"
              >
                I reached out ✓
              </button>
            </form>
          </li>
        ))}
      </ul>
      {overflow > 0 ? (
        <p className="text-xs text-fog">
          +{overflow} more quietly fading —{" "}
          <Link
            href="/app/people"
            className="text-amber underline-offset-2 hover:underline"
          >
            see everyone
          </Link>
        </p>
      ) : null}
    </section>
  );
}
