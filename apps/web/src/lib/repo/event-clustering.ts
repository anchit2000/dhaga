import { eq, max } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { eventContacts, events } from "@/lib/db/schema";
import { addContactToEvent, createEvent } from "@/lib/repo/events";
import {
  NEW_EVENT_PLACEHOLDER_NAME,
  EVENT_CLUSTER_WINDOW_MS,
} from "@/utils/constants/app";

export interface EventClusterCandidate {
  id: string;
  /** Most recent activity in this event: latest scan, or its start time if empty. */
  lastScanAt: Date;
}

export interface EventClusterResult {
  eventId: string;
  isNew: boolean;
}

/**
 * Pure matcher for BRD §6.2 auto event grouping: a new scan joins the most
 * recently active candidate event if the gap to that event's last scan
 * is under the clustering window; otherwise it needs a new event.
 *
 * Candidates are assumed to already share the scan's geohash-6 (the caller's
 * DB query filters that) — kept out of this function so the boundary
 * behaviour (exactly-4h gap, no candidates, several same-geohash events
 * from different visits) is unit-testable without a database.
 */
export function matchEventForScan(
  scannedAt: Date,
  candidates: EventClusterCandidate[],
): string | null {
  let best: EventClusterCandidate | null = null;
  for (const candidate of candidates) {
    const gapMs = Math.abs(scannedAt.getTime() - candidate.lastScanAt.getTime());
    if (gapMs >= EVENT_CLUSTER_WINDOW_MS) continue;
    if (!best || candidate.lastScanAt > best.lastScanAt) best = candidate;
  }
  return best?.id ?? null;
}

/** Events sharing a geohash-6, each with their most recent scan time. */
async function candidatesForGeohash(geohash: string): Promise<EventClusterCandidate[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: events.id,
      startedAt: events.startedAt,
      lastContactScan: max(eventContacts.scannedAt),
    })
    .from(events)
    .leftJoin(eventContacts, eq(eventContacts.eventId, events.id))
    .where(eq(events.geohash, geohash))
    .groupBy(events.id, events.startedAt);
  return rows.map((row) => ({
    id: row.id,
    lastScanAt: row.lastContactScan ?? row.startedAt,
  }));
}

/**
 * The DB-backed half of BRD §6.2: finds (or creates) the event a scan
 * belongs to and attaches the contact to it. Callers only invoke this once
 * they have both a geohash and a scan timestamp (see /api/capture).
 */
export async function attachScanToEvent(
  contactId: string,
  geohash: string,
  scannedAt: Date,
): Promise<EventClusterResult> {
  const candidates = await candidatesForGeohash(geohash);
  const matchedId = matchEventForScan(scannedAt, candidates);
  if (matchedId) {
    await addContactToEvent(matchedId, contactId, scannedAt);
    return { eventId: matchedId, isNew: false };
  }
  const eventId = await createEvent(NEW_EVENT_PLACEHOLDER_NAME, { geohash });
  await addContactToEvent(eventId, contactId, scannedAt);
  return { eventId, isNew: true };
}
