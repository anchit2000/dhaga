"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runAction } from "@/components/app/ActionForm";
import { completeFollowUpAction } from "@/lib/actions/follow-ups";
import {
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { NotificationItem } from "@/lib/repo/notifications";
import { feedKey, type FeedItem } from "./feed";
import { rowActions } from "./row-actions";

/**
 * Every mutation the bell can fire, kept out of the markup so the component
 * stays a rendering concern. Each handler takes the ITEM of its own kind and
 * resolves ids through rowActions(), so an important date's contactId can never
 * reach completeFollowUpAction and a notification id can never be "completed".
 */

type FeedPatch = { type: "hide"; key: string } | { type: "read"; id: string };

/**
 * Hiding is keyed by feedKey, never by a bare id: two tables can hand us the
 * same uuid, and filtering on id alone would vanish an unrelated row. A
 * follow-up hide stays throwaway client state (nothing persists "seen" for a
 * derived reminder); a notification's hide/read is backed by a real write.
 */
function applyPatch(state: FeedItem[], patch: FeedPatch): FeedItem[] {
  if (patch.type === "hide") return state.filter((item) => feedKey(item) !== patch.key);
  return state.map((item) =>
    item.kind === "notification" && item.id === patch.id
      ? { ...item, status: "read" as const }
      : item,
  );
}

/**
 * The notification actions RETURN their error string instead of throwing, so
 * rethrow it into runAction's single toast path — one error surface, no direct
 * toast.error call.
 */
function runNotificationAction(
  action: () => Promise<string | null>,
  message: string,
): Promise<boolean> {
  return runAction(async () => {
    const error = await action();
    if (error) throw new Error(error);
  }, message);
}

export interface FeedActions {
  items: FeedItem[];
  hasUnread: boolean;
  markDone: (item: CalendarFollowUp) => void;
  markRead: (item: NotificationItem) => void;
  dismiss: (item: NotificationItem) => void;
  markAllRead: () => void;
}

export function useFeedActions(initial: FeedItem[]): FeedActions {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, patch] = useOptimistic<FeedItem[], FeedPatch>(initial, applyPatch);

  function markDone(item: CalendarFollowUp): void {
    const { complete } = rowActions(item);
    if (!complete) return; // Only a follow-up carries these ids.
    const formData = new FormData();
    formData.set("followUpId", complete.followUpId);
    formData.set("contactId", complete.contactId);
    startTransition(async () => {
      patch({ type: "hide", key: feedKey(item) });
      const ok = await runAction(
        () => completeFollowUpAction(formData),
        "Couldn't mark that reminder done — please try again.",
      );
      if (ok) router.refresh();
    });
  }

  function markRead(item: NotificationItem): void {
    const { notificationId } = rowActions(item);
    if (!notificationId || item.status !== "unread") return;
    startTransition(async () => {
      patch({ type: "read", id: notificationId });
      await runNotificationAction(
        () => markNotificationReadAction(notificationId),
        "Couldn't mark that notification read — please try again.",
      );
    });
  }

  function dismiss(item: NotificationItem): void {
    const { notificationId } = rowActions(item);
    if (!notificationId) return;
    startTransition(async () => {
      patch({ type: "hide", key: feedKey(item) });
      const ok = await runNotificationAction(
        () => dismissNotificationAction(notificationId),
        "Couldn't dismiss that notification — please try again.",
      );
      if (ok) router.refresh();
    });
  }

  function markAllRead(): void {
    startTransition(async () => {
      for (const item of items) {
        if (item.kind === "notification" && item.status === "unread") {
          patch({ type: "read", id: item.id });
        }
      }
      const ok = await runNotificationAction(
        () => markAllNotificationsReadAction(),
        "Couldn't mark those read — please try again.",
      );
      if (ok) router.refresh();
    });
  }

  return {
    items,
    hasUnread: items.some((i) => i.kind === "notification" && i.status === "unread"),
    markDone,
    markRead,
    dismiss,
    markAllRead,
  };
}
