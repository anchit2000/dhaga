import Link from "next/link";
import { cn } from "@/lib/utils";
import { byOverdueRatio } from "@/lib/repo/daily-suggestions/candidates";
import { DUE_CHECK_INS_ANCHOR } from "@/utils/constants/home";
import { dueCheckInBadge } from "@/utils/due-reach-outs";
import type { DueReachOut } from "@/lib/repo/reminders";

/**
 * Everyone whose keep-in-touch rhythm has run out — the destination for Home's
 * "+N more due" footer, which is why it renders `listDueReachOuts()` UNSLICED:
 * that footer's number is the size of this exact set minus the rows already on
 * the Today tile, so anything filtered or paginated here would make the count
 * and the page disagree. It used to land on `/app/people`, which lists everyone.
 *
 * Above the birthdays and below the open follow-ups: it is work, not awareness,
 * but a rhythm coming due is softer than a promise you made. Read-only for the
 * same reason UpcomingDatesList is — Today owns "Reached out", and a second
 * place to mark it is a second place for the two to disagree.
 *
 * A server component, so `now` is the request's clock and there is no
 * client-side one to hydrate against.
 */
export function DueCheckInsList({ due }: { due: DueReachOut[] }): React.ReactElement | null {
  if (due.length === 0) return null;
  const now = new Date();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The anchor Home's footer links to. */}
        <h2 id={DUE_CHECK_INS_ANCHOR} className="scroll-mt-24 font-display text-lg">
          Due for a check-in
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
          {due.length} {due.length === 1 ? "person" : "people"}
        </span>
      </div>
      <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
        {/* Most-overdue-first, not oldest-touch-first: the same ordering the
            Today tile ranks by, so the people it showed sit at the top here. */}
        {byOverdueRatio(due, now.getTime()).map((person) => {
          const badge = dueCheckInBadge(person.lastTouch, person.everyDays, now);
          const detail = [person.title, person.companyName].filter(Boolean).join(" · ");
          return (
            <li key={person.id}>
              <Link
                href={`/app/people/${person.id}`}
                className="flex min-h-11 items-center gap-3 p-4 transition-colors hover:bg-wash/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-paper">{person.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-fog">
                    {detail ? `${detail} · every ${person.everyDays} days` : `Every ${person.everyDays} days`}
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
