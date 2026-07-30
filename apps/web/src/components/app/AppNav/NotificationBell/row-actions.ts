import type { FeedItem } from "./feed";

/**
 * The ONE place a feed item's ids become action arguments. Each field is
 * non-null for exactly one kind, so a birthday's contactId can never reach
 * completeFollowUpAction and a notification id can never be marked "done" —
 * either mix-up would complete or delete an unrelated row.
 */
export interface FeedRowActions {
  href: string | null;
  /** Follow-ups only: the ids completeFollowUpAction requires. */
  complete: { followUpId: string; contactId: string } | null;
  /** Persisted notifications only: the id read/dismiss take. */
  notificationId: string | null;
}

export function rowActions(item: FeedItem): FeedRowActions {
  switch (item.kind) {
    case "follow-up":
      return {
        href: `/app/people/${item.contactId}`,
        complete: { followUpId: item.id, contactId: item.contactId },
        notificationId: null,
      };
    case "important-date":
      // No completing a birthday: link only.
      return { href: `/app/people/${item.contactId}`, complete: null, notificationId: null };
    case "notification":
      return { href: item.href, complete: null, notificationId: item.id };
  }
}
