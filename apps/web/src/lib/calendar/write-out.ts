import "server-only";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { logActionError } from "@/lib/actions/resilience";
import { syncFollowUpToCalendars, syncNoteFollowUpsToCalendars } from "@/lib/repo/calendar";

/**
 * Mirror a follow-up onto the user's connected calendars AFTER the response is
 * sent. Two reasons it belongs in `after()` rather than inside the mutation:
 *   - it makes outbound Google/Microsoft calls, and a mutation()'s tenant
 *     connection must never be held across HTTP (the pool-exhaustion bug), and
 *   - a calendar that is down must never fail the save the user just made.
 * `userId` is captured from the completed mutation instead of re-read inside the
 * callback, so the sync is bound to the acting user with no request APIs in play.
 * Failures are logged PII-safe (name + error code only) and swallowed; the next
 * change to the same follow-up re-syncs it, because the write is idempotent.
 */
export function scheduleCalendarWriteOut(userId: string, followUpId: string): void {
  if (!followUpId) return;
  schedule(() => syncFollowUpToCalendars(userId, followUpId));
}

/** The same, for every follow-up a note's extraction just created — the path
 *  most follow-ups are actually born on. */
export function scheduleCalendarWriteOutForNote(userId: string, noteId: string): void {
  if (!noteId) return;
  schedule(() => syncNoteFollowUpsToCalendars(userId, noteId));
}

/**
 * The same again, for a caller that runs INSIDE the mutation and so was never
 * handed the acting user — the confirmations resolver, which applies an
 * extraction only once the user confirms it (lib/repo/confirmations/apply.ts).
 * The id is resolved EAGERLY here, before after() is registered, so the
 * deferred sync still runs with no request APIs in play, exactly like the
 * mutation-captured id its siblings take. `getCurrentUser` is memoized
 * per-request and already resolved by the enclosing mutation(), so this costs
 * no extra lookup. With no session there is nobody to sync for and it no-ops —
 * the "called outside a request" case lib/db/request-scope.ts documents.
 */
export async function scheduleCalendarWriteOutForCurrentUserNote(noteId: string): Promise<void> {
  const user = await getCurrentUser().catch(() => null);
  if (user) scheduleCalendarWriteOutForNote(user.id, noteId);
}

function schedule(work: () => Promise<void>): void {
  try {
    after(async () => {
      try {
        await work();
      } catch (error) {
        logActionError("calendarWriteOut", error);
      }
    });
  } catch {
    // after() throws outside a request scope. The vitest suite calls these
    // actions directly with no HTTP request in play — the same case
    // lib/db/request-scope.ts documents — and there is no response to defer
    // past, so there is nothing to schedule. Every real caller (server action,
    // route handler) always has a scope.
  }
}
