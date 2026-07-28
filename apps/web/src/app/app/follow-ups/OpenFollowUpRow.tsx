"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        className="shrink-0"
      >
        <Check />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-paper">{item.action}</p>
        <Link
          href={`/app/people/${item.contactId}`}
          className="mt-0.5 inline-block text-xs text-ember hover:underline"
        >
          {item.contactName}
        </Link>
      </div>
      <Button
        type="button"
        onClick={onDismiss}
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss follow-up"
        className="shrink-0 text-fog hover:text-paper"
      >
        <X />
      </Button>
    </li>
  );
}
