"use client";

import Link from "next/link";
import { Bell, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { badgeLabel, feedKey, type NotificationFeed } from "./feed";
import { FollowUpRow, ImportantDateRow, NotificationRow } from "./rows";
import { useFeedActions } from "./use-feed-actions";

/**
 * Nav bell: ONE feed of due follow-ups, upcoming birthdays/anniversaries and
 * persisted job notices (merged server-side — see ./feed.ts). Which affordance
 * a row gets is decided per kind in ./rows.tsx: a follow-up can be completed, a
 * notification read/dismissed, an important date only opened.
 */
export function NotificationBell({ feed }: { feed: NotificationFeed }): React.ReactElement {
  const { items, hasUnread, markDone, markRead, dismiss, markAllRead } = useFeedActions(
    feed.items,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative size-11 rounded-full",
              feed.badgeCount > 0 ? "text-paper" : "text-fog hover:text-paper",
            )}
          />
        }
      >
        <Bell className="size-5" />
        {feed.badgeCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber/20 px-1 font-mono text-[10px] font-medium text-ember ring-2 ring-ink">
            {badgeLabel(feed.badgeCount)}
          </span>
        ) : null}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex min-h-11 items-center justify-between gap-2 px-3">
          <span className="text-sm font-medium text-paper">Notifications</span>
          {/* Only shown when there IS something unread, so it adds no chrome to
              a feed of derived reminders (which have nothing to mark). */}
          {hasUnread ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={markAllRead}
              className="h-11 w-auto rounded-full px-2 text-xs font-normal text-fog hover:text-ember"
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-fog">{"You're all caught up ✨"}</p>
        ) : (
          <div className="max-h-[19rem] overflow-y-auto p-1">
            {items.map((item) => {
              switch (item.kind) {
                case "follow-up":
                  return <FollowUpRow key={feedKey(item)} item={item} onDone={markDone} />;
                case "important-date":
                  return <ImportantDateRow key={feedKey(item)} item={item} />;
                case "notification":
                  return (
                    <NotificationRow
                      key={feedKey(item)}
                      item={item}
                      onOpen={markRead}
                      onDismiss={dismiss}
                    />
                  );
              }
            })}
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
