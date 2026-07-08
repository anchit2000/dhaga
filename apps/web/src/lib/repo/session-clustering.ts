import { eq, max } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { sessionContacts, sessions } from "@/lib/db/schema";
import { addContactToSession, createSession } from "@/lib/repo/sessions";
import {
  NEW_SESSION_PLACEHOLDER_NAME,
  SESSION_CLUSTER_WINDOW_MS,
} from "@/utils/constants/app";

export interface SessionClusterCandidate {
  id: string;
  /** Most recent activity in this session: latest scan, or its start time if empty. */
  lastScanAt: Date;
}

export interface SessionClusterResult {
  sessionId: string;
  isNew: boolean;
}

/**
 * Pure matcher for BRD §6.2 auto event grouping: a new scan joins the most
 * recently active candidate session if the gap to that session's last scan
 * is under the clustering window; otherwise it needs a new session.
 *
 * Candidates are assumed to already share the scan's geohash-6 (the caller's
 * DB query filters that) — kept out of this function so the boundary
 * behaviour (exactly-4h gap, no candidates, several same-geohash sessions
 * from different visits) is unit-testable without a database.
 */
export function matchSessionForScan(
  scannedAt: Date,
  candidates: SessionClusterCandidate[],
): string | null {
  let best: SessionClusterCandidate | null = null;
  for (const candidate of candidates) {
    const gapMs = Math.abs(scannedAt.getTime() - candidate.lastScanAt.getTime());
    if (gapMs >= SESSION_CLUSTER_WINDOW_MS) continue;
    if (!best || candidate.lastScanAt > best.lastScanAt) best = candidate;
  }
  return best?.id ?? null;
}

/** Sessions sharing a geohash-6, each with their most recent scan time. */
async function candidatesForGeohash(geohash: string): Promise<SessionClusterCandidate[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: sessions.id,
      startedAt: sessions.startedAt,
      lastContactScan: max(sessionContacts.scannedAt),
    })
    .from(sessions)
    .leftJoin(sessionContacts, eq(sessionContacts.sessionId, sessions.id))
    .where(eq(sessions.geohash, geohash))
    .groupBy(sessions.id, sessions.startedAt);
  return rows.map((row) => ({
    id: row.id,
    lastScanAt: row.lastContactScan ?? row.startedAt,
  }));
}

/**
 * The DB-backed half of BRD §6.2: finds (or creates) the session a scan
 * belongs to and attaches the contact to it. Callers only invoke this once
 * they have both a geohash and a scan timestamp (see /api/capture).
 */
export async function attachScanToSession(
  contactId: string,
  geohash: string,
  scannedAt: Date,
): Promise<SessionClusterResult> {
  const candidates = await candidatesForGeohash(geohash);
  const matchedId = matchSessionForScan(scannedAt, candidates);
  if (matchedId) {
    await addContactToSession(matchedId, contactId, scannedAt);
    return { sessionId: matchedId, isNew: false };
  }
  const sessionId = await createSession(NEW_SESSION_PLACEHOLDER_NAME, geohash);
  await addContactToSession(sessionId, contactId, scannedAt);
  return { sessionId, isNew: true };
}
