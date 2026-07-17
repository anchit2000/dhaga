"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeTile } from "./HomeTile";
import { completeFollowUpAction } from "@/lib/actions/notes";
import type { listAllOpenFollowUps } from "@/lib/repo/reminders";

/**
 * Home's follow-ups bento tile. The old unbounded "Reach out" list is
 * retired in favor of "Today", which is now the canonical reach-out surface.
 */
export function HomeActions({ openFollowUps, onSelectContact }: {
  openFollowUps: Awaited<ReturnType<typeof listAllOpenFollowUps>>;
  onSelectContact: (id: string) => void;
}) {
  return (
    <HomeTile
      title="Follow-ups"
      meta={openFollowUps.length > 0 ? <span className="font-mono text-[10px] uppercase tracking-widest text-fog">{openFollowUps.length} open</span> : null}
    >
      {openFollowUps.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ember">All clear</p>
          <p className="mt-2 text-sm text-paper">You&apos;re caught up.</p>
          <p className="mt-1 text-xs text-fog">Reminders and note-derived follow-ups will collect here.</p>
        </div>
      ) : (
        <div className="divide-y divide-seam">
          {openFollowUps.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <form action={completeFollowUpAction}>
                <input type="hidden" name="followUpId" value={item.id} />
                <input type="hidden" name="contactId" value={item.contactId} />
                <Button type="submit" variant="ghost" size="icon-sm" aria-label="Mark done"><Check /></Button>
              </form>
              {/* Action wraps in full — the rail tile is too narrow to truncate against. */}
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-paper">{item.action}</p>
                <Button render={<div />} variant="ghost" onClick={() => onSelectContact(item.contactId)} className="mt-0.5 h-auto rounded-md p-0 text-xs font-normal normal-case text-amber hover:bg-transparent hover:underline">{item.contactName}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </HomeTile>
  );
}
