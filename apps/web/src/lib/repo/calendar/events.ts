import { connectionCapabilities, type TimeRange } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { getRateLimiter } from "@/lib/ratelimit";
import { connectedCalendarRows, markNeedsReconnect, providerFor, usableAccessToken } from "./access";

/**
 * One real event from a connected calendar, shaped for the client.
 *
 * Deliberately WITHOUT attendees: providers normalise them (packages/core
 * CalendarEvent) because the gateway contract needs them, but they are
 * third-party PII and nothing in this milestone displays them — so they never
 * cross into the RSC payload, never reach a log, and never reach an LLM.
 */
export interface ExternalCalendarEvent {
  /** Unique within a render: the provider's event id is only unique per connection. */
  id: string;
  connectionId: string;
  provider: string;
  accountEmail: string | null;
  title: string | null;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
}

/**
 * Real events from every connection the user has UPGRADED, for `range`.
 *
 * Capability is derived from each connection's granted scope
 * (connectionCapabilities), so a free/busy-only connection is never asked for
 * events — `listEvents` is not called for it at all. Sequential over
 * connections, sharing the one request-scoped DB connection: fanning out per
 * calendar is exactly the pool-exhaustion trap this codebase keeps hitting.
 *
 * Rate-limited per user because every iteration spends the user's own
 * Google/Microsoft quota; when the bucket is empty the render simply shows no
 * external events rather than failing the page.
 */
export async function getExternalCalendarEvents(range: TimeRange): Promise<ExternalCalendarEvent[]> {
  const userId = await requireUserId();
  const rows = await connectedCalendarRows();
  const readable = rows.filter((row) => {
    const provider = providerFor(row);
    return provider !== null && connectionCapabilities(provider, row.scope).readEvents;
  });
  if (readable.length === 0) return [];
  const { allowed } = await getRateLimiter().consume(userId, "calendar_external");
  if (!allowed) return [];

  const all: ExternalCalendarEvent[] = [];
  for (const row of readable) {
    try {
      const provider = providerFor(row);
      if (!provider?.listEvents) continue;
      const accessToken = await usableAccessToken(provider, row);
      if (!accessToken) continue;
      const events = await provider.listEvents({ accessToken, range });
      for (const event of events) {
        all.push({
          id: `${row.id}:${event.id}`,
          connectionId: row.id,
          provider: row.provider,
          accountEmail: row.accountEmail,
          title: event.title,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          location: event.location,
        });
      }
    } catch {
      // Never log the failure body — it can echo event titles/attendees.
      await markNeedsReconnect(row.id);
    }
  }
  return all;
}
