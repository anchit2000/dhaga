import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UpcomingImportantDate } from "@/lib/repo/reminders";
import {
  upcomingDateBadge,
  upcomingDateWindowLabel,
  upcomingDateYearsPhrase,
} from "./upcoming-date-copy";

/**
 * Birthdays and anniversaries falling inside the user's lead window, soonest
 * first — passive awareness that sits BELOW the open follow-ups because those
 * are the actionable half of the page.
 *
 * Deliberately a separate block, not rows in OpenFollowUpsList: a follow-up row
 * carries done/dismiss, and neither means anything for a birthday. No action
 * buttons here, so the whole row is the link to the contact (min-h-11 keeps the
 * touch target honest). Renders nothing when the window is empty — an empty
 * section on a page about pending work is noise, and "All caught up" above still
 * speaks only for follow-ups.
 *
 * A server component: `daysUntil` is computed per request by the repo, so there
 * is no client-side clock to disagree with the server render.
 */
export function UpcomingDatesList({
  dates,
  leadDays,
}: {
  dates: UpcomingImportantDate[];
  leadDays: number;
}): React.ReactElement | null {
  if (dates.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg">Upcoming dates</h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
          {upcomingDateWindowLabel(leadDays)}
        </span>
      </div>
      <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
        {dates.map((item, index) => {
          const badge = upcomingDateBadge(item.daysUntil);
          const years = upcomingDateYearsPhrase(item.label, item.turning);
          return (
            // Index guards the key: a contact can hold two identical entries
            // after a double import, and the list never reorders.
            <li key={`${item.contactId}-${item.date}-${index}`}>
              <Link
                href={`/app/people/${item.contactId}`}
                className="flex min-h-11 items-center gap-3 p-4 transition-colors hover:bg-wash/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-paper">{item.contactName}</span>
                  <span className="mt-0.5 block truncate text-xs text-fog">
                    {years ? `${item.label} · ${years}` : item.label}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-[10px] uppercase tracking-wider",
                    badge.urgent ? "text-ember" : "text-fog",
                  )}
                >
                  {badge.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
