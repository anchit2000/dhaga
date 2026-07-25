import Link from "next/link";
import { Check, X } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listAllOpenFollowUps } from "@/lib/repo/reminders";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/follow-ups";

export const metadata = { title: "Follow-ups — Dhaga" };

/** Every open follow-up across the graph — the destination for Home's
 *  Follow-ups tile "+N more". Reuses the same complete/dismiss actions. */
export default async function FollowUpsPage() {
  await requireUserIdForPage();
  const followUps = await listAllOpenFollowUps();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">Follow-ups</h1>
        {followUps.length > 0 ? (
          <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
            {followUps.length} open
          </span>
        ) : null}
      </div>

      {followUps.length === 0 ? (
        <EmptyState title="All caught up" body="Reminders and note-derived follow-ups will collect here." />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {followUps.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <form action={completeFollowUpAction} className="shrink-0">
                <input type="hidden" name="followUpId" value={item.id} />
                <input type="hidden" name="contactId" value={item.contactId} />
                <Button type="submit" variant="ghost" size="icon-sm" aria-label="Mark done">
                  <Check />
                </Button>
              </form>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-paper">{item.action}</p>
                <Link
                  href={`/app/people/${item.contactId}`}
                  className="mt-0.5 inline-block text-xs text-amber hover:underline"
                >
                  {item.contactName}
                </Link>
              </div>
              <form action={dismissFollowUpAction} className="shrink-0">
                <input type="hidden" name="followUpId" value={item.id} />
                <input type="hidden" name="contactId" value={item.contactId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Dismiss follow-up"
                  className="text-fog/60 hover:text-paper"
                >
                  <X />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
