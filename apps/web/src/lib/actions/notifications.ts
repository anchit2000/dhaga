"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/repo/notifications";

/**
 * Notification feed actions. Each is ONE write inside ONE scoped connection
 * (mutation()), then revalidates the app shell so the bell's badge count and
 * the feed re-render with the row gone or greyed.
 *
 * Return shape is the optimistic one (`string | null` = error or nothing) so a
 * bell row can flip instantly and only reconcile on failure.
 */

/** Revalidate the shell every /app page renders the bell from. */
function revalidateShell(): void {
  revalidatePath("/app");
}

export async function markNotificationReadAction(id: string): Promise<string | null> {
  if (!id) return null;
  const r = await mutation("markNotificationRead", () => markNotificationRead(id));
  if (!r.ok) return r.error;
  revalidateShell();
  return null;
}

export async function dismissNotificationAction(id: string): Promise<string | null> {
  if (!id) return null;
  const r = await mutation("dismissNotification", () => dismissNotification(id));
  if (!r.ok) return r.error;
  revalidateShell();
  return null;
}

export async function markAllNotificationsReadAction(): Promise<string | null> {
  const r = await mutation("markAllNotificationsRead", () => markAllNotificationsRead());
  if (!r.ok) return r.error;
  revalidateShell();
  return null;
}
