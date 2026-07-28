"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { runAction } from "@/components/app/ActionForm";
import { completeFollowUpAction } from "@/lib/actions/follow-ups";
import { cn } from "@/lib/utils";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

export type NotificationSummary = {
  dueToday: number;
  overdue: number;
  items: CalendarFollowUp[];
};

/** Nav bell: overdue + due-today follow-ups, mark-done inline, links to calendar. */
export function NotificationBell({
  summary,
}: {
  summary: NotificationSummary;
}): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, dismiss] = useOptimistic<CalendarFollowUp[], string>(
    summary.items,
    (state, id) => state.filter((item) => item.id !== id),
  );

  const total = summary.dueToday + summary.overdue;

  function markDone(item: CalendarFollowUp): void {
    const formData = new FormData();
    formData.set("followUpId", item.id);
    formData.set("contactId", item.contactId);
    startTransition(async () => {
      dismiss(item.id);
      const ok = await runAction(
        () => completeFollowUpAction(formData),
        "Couldn't mark that reminder done — please try again.",
      );
      if (ok) router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative size-11 rounded-full",
              total > 0 ? "text-paper" : "text-fog hover:text-paper",
            )}
          />
        }
      >
        <Bell className="size-5" />
        {total > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber/20 px-1 font-mono text-[10px] font-medium text-ember ring-2 ring-ink">
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
        <span className="sr-only">Reminders</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-medium text-paper">Reminders</span>
          {total > 0 ? <span className="font-mono text-xs text-fog">{total} due</span> : null}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-fog">
            {"You're all caught up ✨"}
          </p>
        ) : (
          <div className="max-h-[19rem] overflow-y-auto p-1">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <DropdownMenuItem
                  render={<Link href={`/app/people/${item.contactId}`} />}
                  className="flex-col items-start gap-0.5 pr-16"
                >
                  <span className="w-full truncate text-sm font-medium text-paper">
                    {item.contactName}
                  </span>
                  <span className="w-full truncate text-xs text-fog">{item.action}</span>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                      item.overdue ? "bg-amber/20 text-ember" : "text-fog",
                    )}
                  >
                    {item.overdue ? "Overdue" : "Due today"}
                  </span>
                </DropdownMenuItem>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => markDone(item)}
                  className="absolute right-2 top-2 gap-1 text-fog hover:text-ember"
                >
                  <Check className="size-3" />
                  Done
                </Button>
              </div>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="grid grid-cols-2 gap-1 p-1">
          <DropdownMenuItem
            render={<Link href="/app/calendar" />}
            className="justify-center text-xs text-fog"
          >
            <CalendarDays className="size-3.5" />
            Open calendar
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/app/follow-ups" />}
            className="justify-center text-xs text-fog"
          >
            All follow-ups
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
