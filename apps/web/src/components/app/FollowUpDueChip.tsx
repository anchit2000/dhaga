"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { followUpDueBadge } from "@/utils/follow-up-due";

/**
 * The "due in 3 days" / "due for long" chip on a follow-up row — the visible
 * half of how the list is ordered (see listAllOpenFollowUps).
 *
 * `now` is read once per mount rather than per render so a re-render can't move
 * the boundary mid-session, and never at module scope (that would freeze it for
 * the life of the server process).
 */
export function FollowUpDueChip({
  item,
  className,
}: {
  item: { dueDate: Date | null; createdAt: Date };
  className?: string;
}) {
  const badge = useMemo(() => followUpDueBadge(item, new Date()), [item]);
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider",
        badge.urgent ? "text-human" : "text-fog",
        className,
      )}
    >
      {badge.label}
    </span>
  );
}
