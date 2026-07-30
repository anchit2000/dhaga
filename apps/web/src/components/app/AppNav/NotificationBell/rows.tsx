"use client";

import { cn } from "@/lib/utils";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { NotificationItem } from "@/lib/repo/notifications";
import type { ImportantDateItem } from "./feed";
import { rowActions } from "./row-actions";
import { importantDateDetail, importantDateWhen } from "./labels";
import { CHIP, DismissAction, DoneAction, RowShell, RowTitle } from "./row-shell";

/**
 * One component per feed kind, each typed to ITS item only — that is the guard
 * against handing a birthday's contactId to completeFollowUpAction: the
 * affordance for a kind cannot be rendered against another kind's item without
 * a type error, and only this file decides which affordance a row gets.
 */

export function FollowUpRow({
  item,
  onDone,
}: {
  item: CalendarFollowUp;
  onDone: (item: CalendarFollowUp) => void;
}): React.ReactElement {
  return (
    <RowShell
      href={rowActions(item).href}
      action={<DoneAction onClick={() => onDone(item)} />}
    >
      <RowTitle>{item.contactName}</RowTitle>
      <span className="w-full truncate text-xs text-fog">{item.action}</span>
      <span className={cn(CHIP, item.overdue ? "bg-amber/20 text-ember" : "text-fog")}>
        {item.overdue ? "Overdue" : "Due today"}
      </span>
    </RowShell>
  );
}

/** No Done affordance — a birthday cannot be completed, only opened. */
export function ImportantDateRow({ item }: { item: ImportantDateItem }): React.ReactElement {
  return (
    <RowShell href={rowActions(item).href}>
      <RowTitle>{item.contactName}</RowTitle>
      <span className="w-full truncate text-xs text-fog">{importantDateDetail(item)}</span>
      <span className={cn(CHIP, item.daysUntil <= 0 ? "bg-amber/20 text-ember" : "text-fog")}>
        {importantDateWhen(item.daysUntil)}
      </span>
    </RowShell>
  );
}

export function NotificationRow({
  item,
  onOpen,
  onDismiss,
}: {
  item: NotificationItem;
  // Handlers take the ITEM, not a bare id: the bell resolves ids through
  // rowActions() so no call site ever types one out by hand.
  onOpen: (item: NotificationItem) => void;
  onDismiss: (item: NotificationItem) => void;
}): React.ReactElement {
  return (
    <RowShell
      href={rowActions(item).href}
      onOpen={() => onOpen(item)}
      action={<DismissAction onClick={() => onDismiss(item)} />}
    >
      <span className="flex w-full items-start gap-1.5">
        {item.status === "unread" ? (
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
        ) : null}
        <span className="line-clamp-2 text-sm font-medium text-paper">{item.title}</span>
      </span>
      {item.body ? (
        <span
          className={cn(
            "line-clamp-2 w-full text-xs",
            item.type === "job_failed" ? "text-destructive" : "text-fog",
          )}
        >
          {item.body}
        </span>
      ) : null}
    </RowShell>
  );
}
