import Link from "next/link";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";
import { listQuietContacts } from "@/lib/repo/strength";
import { listNewSignals } from "@/lib/repo/signals";
import { completeFollowUpAction } from "@/lib/actions/notes";
import { markReachedOutAction } from "@/lib/actions/reminders";
import { EmptyState } from "@/components/app/EmptyState";
import { GoingQuiet } from "@/components/app/home/GoingQuiet";
import { SignalsFeed } from "@/components/app/home/SignalsFeed";
import { Check } from "lucide-react";

export const metadata = { title: "Home — Dhaga" };

function daysAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

export default async function HomePage() {
  await requireUserIdForPage();
  const [dueReachOuts, openFollowUps, quietContacts, newSignals] = await Promise.all([
    listDueReachOuts(),
    listAllOpenFollowUps(),
    listQuietContacts(),
    listNewSignals(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl tracking-tight">Home</h1>

      <SignalsFeed signals={newSignals} />

      <section className="space-y-3">
        <h2 className="font-display text-lg">Reach out</h2>
        {dueReachOuts.length === 0 ? (
          <p className="text-sm text-fog">
            Nobody is overdue. Set a keep-in-touch cadence on a contact and
            they&apos;ll surface here when it&apos;s time.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dueReachOuts.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-amber/25 bg-amber/[0.05] px-3 py-2.5"
              >
                <Link href={`/app/people/${person.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-paper">
                    {person.name}
                  </span>
                  <span className="block truncate text-xs text-fog">
                    {[person.title, person.companyName].filter(Boolean).join(" · ") ||
                      "—"}{" "}
                    · last touch {daysAgo(person.lastTouch)}
                  </span>
                </Link>
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
        )}
      </section>

      <GoingQuiet contacts={quietContacts} />

      <section className="space-y-3">
        <h2 className="font-display text-lg">Open follow-ups</h2>
        {openFollowUps.length === 0 ? (
          <EmptyState
            title="Nothing open"
            body="Follow-ups extracted from your notes collect here until you mark them done."
          />
        ) : (
          <ul className="space-y-1.5">
            {openFollowUps.map((followUp) => (
              <li
                key={followUp.id}
                className="flex items-center gap-2.5 rounded-lg border border-seam bg-panel px-3 py-2"
              >
                <form action={completeFollowUpAction} className="shrink-0">
                  <input type="hidden" name="followUpId" value={followUp.id} />
                  <input type="hidden" name="contactId" value={followUp.contactId} />
                  <button
                    type="submit"
                    aria-label="Mark done"
                    className="flex size-5 items-center justify-center rounded-full border border-amber/50 text-amber transition-colors hover:bg-amber/15"
                  >
                    <Check className="size-3" />
                  </button>
                </form>
                <p className="min-w-0 flex-1 truncate text-sm text-paper">
                  {followUp.action}
                  {followUp.dueHint ? (
                    <span className="text-fog"> — {followUp.dueHint}</span>
                  ) : null}
                </p>
                <Link
                  href={`/app/people/${followUp.contactId}`}
                  className="shrink-0 text-xs text-amber underline-offset-2 hover:underline"
                >
                  {followUp.contactName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
