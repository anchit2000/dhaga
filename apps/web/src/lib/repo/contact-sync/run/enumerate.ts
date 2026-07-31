import type { ChangedContactsPage, ContactSyncTarget } from "@dhaga/core/src/sync/types";

/**
 * The read half of a run: asking a provider what it holds, and deciding what
 * that answer is allowed to authorise.
 *
 * Split out of ./index.ts because this is the one place in server-side sync
 * where getting it wrong destroys data, and it deserves to be readable and
 * testable on its own.
 */

/**
 * Enumerate the remote address book, incrementally when the target can.
 *
 * `cursor` is whatever was stored on the connection last run — opaque here on
 * purpose. Only the provider knows whether its own token is a Google syncToken
 * or a Graph deltaLink, and only the provider can tell when it has expired
 * (both answer 410, and both recover by re-enumerating in full).
 */
export async function enumerateRemote(
  target: ContactSyncTarget,
  cursor: string | null,
): Promise<ChangedContactsPage> {
  // Not every target has an incremental mode, and that is fine: the mobile
  // device target has no cursor to offer at all. Its whole-book answer IS
  // complete, so it is honestly a full page — this fallback keeps such a target
  // syncing exactly as it did before incremental existed.
  if (!target.listChangedSince) {
    return { mode: "full", contacts: await target.listChanged(null), cursor: null };
  }
  return target.listChangedSince(cursor);
}

/**
 * Whether this enumeration may authorise reconcileContacts' DELETION SWEEP.
 *
 * The sweep tombstones every link whose external record was absent from the
 * batch. That is only sound when the batch was the COMPLETE address book: an
 * incremental page contains only what CHANGED, so "absent" means "unchanged"
 * for almost every contact the user has. Passing an incremental result as full
 * would therefore unlink nearly the entire address book on the first
 * incremental run — the single worst thing this feature could do.
 *
 * A predicate rather than an inline `page.mode === "full"` so the rule has a
 * name, one definition, and a test that fails the moment someone widens it.
 * See lib/repo/sync/sweep.ts for the other half of the guard: even an
 * authorised sweep refuses to act on an empty batch, because "I observed
 * nothing" is indistinguishable from "I failed to enumerate".
 */
export function authorisesSweep(page: ChangedContactsPage): boolean {
  return page.mode === "full";
}

/**
 * The cursor to store after a run, or null to clear whatever was held.
 *
 * `writeFailures` is why this is not simply `page.cursor`. A failed push is
 * only ever retried because the NEXT run re-observes that contact and re-derives
 * the same write from the base snapshot — and an incremental run will not
 * re-observe a contact that did not change. Dropping the cursor forces the next
 * run to enumerate in full, which is what makes "N change(s) could not be
 * written and will retry" a true statement rather than a hopeful one.
 *
 * Clearing is always safe: the only cost is one full enumeration.
 */
export function nextCursor(page: ChangedContactsPage, writeFailures: number): string | null {
  return writeFailures > 0 ? null : page.cursor;
}
