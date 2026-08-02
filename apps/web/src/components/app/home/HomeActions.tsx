"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowUpDueChip } from "@/components/app/FollowUpDueChip";
import { HomeTile } from "./HomeTile";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/follow-ups";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import type { listAllOpenFollowUps } from "@/lib/repo/reminders";

type HomeFollowUp = Awaited<ReturnType<typeof listAllOpenFollowUps>>[number];

/**
 * Home's follow-ups bento tile. The old unbounded "Reach out" list is
 * retired in favor of "Today", which is now the canonical reach-out surface.
 * Capped to a short preview so this tile never towers over its bento neighbors;
 * the header meta carries the full count and the footer links to the full
 * /app/follow-ups list ("+N more" is the click target).
 *
 * Complete/dismiss drop the row optimistically (useOptimisticList) and fire the
 * server action in the background — the user never waits, and a failed write
 * rolls the row back with a Retry toast (never the full-page error boundary).
 * The count, preview slice, and empty state all derive from the optimistic
 * items so they track the pending edit, not stale server data.
 */
export function HomeActions({ openFollowUps, onSelectContact }: {
  openFollowUps: Awaited<ReturnType<typeof listAllOpenFollowUps>>;
  onSelectContact: (id: string) => void;
}) {
  const router = useRouter();
  const { items, remove } = useOptimisticList<HomeFollowUp>({
    items: openFollowUps,
    errorMessage: "Couldn't update that follow-up — try again.",
  });

  function handleRemove(
    item: HomeFollowUp,
    action: (formData: FormData) => Promise<void>,
  ): void {
    remove(item, async () => {
      const data = new FormData();
      data.set("followUpId", item.id);
      data.set("contactId", item.contactId);
      await action(data);
      // The actions revalidate /app and the contact page — refresh so this
      // tile's server data drops the row and reconciles the optimistic edit.
      router.refresh();
      return null;
    });
  }

  const shown = items.slice(0, HOME_PREVIEW_LIMIT);
  const overflow = items.length - shown.length;

  return (
    <HomeTile
      title="Follow-ups"
      tone="attention"
      meta={items.length > 0 ? <span className="font-mono text-[10px] uppercase tracking-widest text-fog">{items.length} open</span> : null}
    >
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ember">All clear</p>
          <p className="mt-2 text-sm text-paper">You&apos;re caught up.</p>
          <p className="mt-1 text-xs text-fog">Reminders and note-derived follow-ups will collect here.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-seam">
            {shown.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <Button type="button" onClick={() => handleRemove(item, completeFollowUpAction)} variant="ghost" size="icon-sm" aria-label="Mark done" className="shrink-0"><Check /></Button>
                {/* Action wraps in full — the rail tile is too narrow to truncate against. */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-paper">{item.action}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                    <Button render={<div />} variant="ghost" onClick={() => onSelectContact(item.contactId)} className="h-auto rounded-md p-0 text-xs font-normal normal-case text-ember hover:bg-transparent hover:underline">{item.contactName}</Button>
                    <FollowUpDueChip item={item} />
                  </div>
                </div>
                <Button type="button" onClick={() => handleRemove(item, dismissFollowUpAction)} variant="ghost" size="icon-sm" aria-label="Dismiss follow-up" className="shrink-0 text-fog hover:text-paper"><X /></Button>
              </div>
            ))}
          </div>
          <Link
            href="/app/follow-ups"
            className="mt-auto inline-flex min-h-11 items-center pt-1 text-xs text-ember hover:underline"
          >
            {overflow > 0 ? `+${overflow} more` : "View all"} →
          </Link>
        </>
      )}
    </HomeTile>
  );
}
