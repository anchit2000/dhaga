import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeFollowUpAction } from "@/lib/actions/notes";
import { markReachedOutAction } from "@/lib/actions/reminders";
import type { listAllOpenFollowUps, listDueReachOuts } from "@/lib/repo/reminders";

function daysAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

export function HomeActions({ dueReachOuts, openFollowUps }: {
  dueReachOuts: Awaited<ReturnType<typeof listDueReachOuts>>;
  openFollowUps: Awaited<ReturnType<typeof listAllOpenFollowUps>>;
}) {
  if (dueReachOuts.length === 0 && openFollowUps.length === 0) return <div className="rounded-xl border border-seam bg-panel px-4 py-3"><p className="text-sm text-paper">You&apos;re caught up.</p><p className="mt-0.5 text-xs text-fog">Reminders and note-derived follow-ups will collect here.</p></div>;
  return <div className="space-y-5">
    {dueReachOuts.length > 0 ? <section className="space-y-2"><h2 className="font-display text-lg">Reach out</h2>{dueReachOuts.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-xl border border-amber/25 bg-amber/[0.05] px-3 py-2.5"><Link href={`/app/people/${person.id}`} className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-paper">{person.name}</span><span className="block truncate text-xs text-fog">Last touch {daysAgo(person.lastTouch)}</span></Link><form action={markReachedOutAction}><input type="hidden" name="contactId" value={person.id} /><Button type="submit" variant="outline" size="sm">Reached out</Button></form></div>)}</section> : null}
    {openFollowUps.length > 0 ? <section className="space-y-2"><h2 className="font-display text-lg">Open follow-ups</h2>{openFollowUps.map((item) => <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-seam bg-panel px-3 py-2"><form action={completeFollowUpAction}><input type="hidden" name="followUpId" value={item.id} /><input type="hidden" name="contactId" value={item.contactId} /><Button type="submit" variant="ghost" size="icon-sm" aria-label="Mark done"><Check /></Button></form><p className="min-w-0 flex-1 truncate text-sm text-paper">{item.action}</p><Link href={`/app/people/${item.contactId}`} className="text-xs text-amber hover:underline">{item.contactName}</Link></div>)}</section> : null}
  </div>;
}
