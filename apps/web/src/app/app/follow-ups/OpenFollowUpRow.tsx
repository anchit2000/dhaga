"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowUpDueChip } from "@/components/app/FollowUpDueChip";
import { companyFilteredHref } from "@/utils/company-href";
import type { OpenFollowUpItem } from "@/lib/repo/reminders";

/** One open-follow-up row. The complete/dismiss buttons call back into
 *  OpenFollowUpsList, which drops the row optimistically and runs the write —
 *  so these are plain buttons, not server-action forms. */
export function OpenFollowUpRow({
  item,
  onComplete,
  onDismiss,
}: {
  item: OpenFollowUpItem;
  onComplete: () => void;
  onDismiss: () => void;
}) {
  return (
    <li className="flex items-start gap-3 p-4">
      <Button
        type="button"
        onClick={onComplete}
        variant="ghost"
        size="icon-sm"
        aria-label="Mark done"
        className="min-h-11 min-w-11 shrink-0"
      >
        <Check />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-paper">{item.action}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
          {item.contactId && item.contactName ? <Link
            href={`/app/people/${item.contactId}`}
            className="inline-flex min-h-11 items-center text-xs text-ember hover:underline"
          >
            {item.contactName}
          </Link> : item.companyId && item.companyName ? <Link
            href={companyFilteredHref(item.companyName)}
            className="inline-flex min-h-11 items-center text-xs text-ember hover:underline"
          >{item.companyName}</Link> : <span className="text-xs text-fog">Personal task</span>}
          <FollowUpDueChip item={item} />
        </div>
      </div>
      <Button
        type="button"
        onClick={onDismiss}
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss follow-up"
        className="min-h-11 min-w-11 shrink-0 text-fog hover:text-paper"
      >
        <X />
      </Button>
    </li>
  );
}
