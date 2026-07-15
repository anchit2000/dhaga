import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lt, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { extractionJobs, type ExtractionJobRow } from "@/lib/db/schema";
import {
  EXTRACTION_JOB_RECENT_WINDOW_MS,
  EXTRACTION_REAP_AFTER_MS,
  EXTRACTION_STALLED_AFTER_MS,
} from "@/utils/constants/extraction-jobs";
import type { ExtractionJobKind, ExtractionJobView } from "@/types";

const ACTIVE = ["pending", "running"] as const;

export async function createExtractionJob(input: {
  contactId: string;
  kind: ExtractionJobKind;
  noteId?: string;
}): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(extractionJobs).values({
    id,
    contactId: input.contactId,
    kind: input.kind,
    noteId: input.noteId ?? null,
  });
  return id;
}

export async function getExtractionJob(id: string): Promise<ExtractionJobRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(extractionJobs).where(eq(extractionJobs.id, id)).limit(1);
  return row ?? null;
}

/**
 * Atomically move pending → running. The `WHERE status = 'pending'` guard means
 * only the first caller wins, so a double-fire (poller retriggers, a retry
 * races the reaper) can never run the same job twice. Returns null when the
 * claim was lost — the caller treats that as "already handled".
 */
export async function claimExtractionJob(id: string): Promise<ExtractionJobRow | null> {
  const db = await getDb();
  const [row] = await db
    .update(extractionJobs)
    .set({ status: "running", stage: null, error: null, updatedAt: new Date() })
    .where(and(eq(extractionJobs.id, id), eq(extractionJobs.status, "pending")))
    .returning();
  return row ?? null;
}

export async function setExtractionJobStage(id: string, stage: string): Promise<void> {
  const db = await getDb();
  await db
    .update(extractionJobs)
    .set({ stage, updatedAt: new Date() })
    .where(eq(extractionJobs.id, id));
}

export async function attachExtractionJobNote(id: string, noteId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(extractionJobs)
    .set({ noteId, updatedAt: new Date() })
    .where(eq(extractionJobs.id, id));
}

export async function completeExtractionJob(
  id: string,
  counts: { factCount: number; followUpCount: number },
): Promise<void> {
  const db = await getDb();
  await db
    .update(extractionJobs)
    .set({
      status: "done",
      stage: null,
      error: null,
      factCount: counts.factCount,
      followUpCount: counts.followUpCount,
      updatedAt: new Date(),
    })
    .where(eq(extractionJobs.id, id));
}

export async function failExtractionJob(id: string, message: string): Promise<void> {
  const db = await getDb();
  await db
    .update(extractionJobs)
    .set({ status: "error", stage: null, error: message, updatedAt: new Date() })
    .where(eq(extractionJobs.id, id));
}

/** Re-queue an errored or stalled job. Only the owner's rows are visible (RLS),
 *  so no explicit ownership check is needed beyond the caller's auth. */
export async function retryExtractionJob(id: string): Promise<ExtractionJobRow | null> {
  const db = await getDb();
  const [row] = await db
    .update(extractionJobs)
    .set({ status: "pending", stage: null, error: null, updatedAt: new Date() })
    .where(
      and(
        eq(extractionJobs.id, id),
        inArray(extractionJobs.status, ["error", "running", "pending"]),
      ),
    )
    .returning();
  return row ?? null;
}

/** Active jobs plus terminal ones finished recently (so a "done — 3 facts"
 *  summary lingers briefly before the poller drops it). */
export async function listRecentExtractionJobs(contactId: string): Promise<ExtractionJobRow[]> {
  const db = await getDb();
  const recentCutoff = new Date(Date.now() - EXTRACTION_JOB_RECENT_WINDOW_MS);
  return db
    .select()
    .from(extractionJobs)
    .where(
      and(
        eq(extractionJobs.contactId, contactId),
        or(inArray(extractionJobs.status, [...ACTIVE]), gte(extractionJobs.updatedAt, recentCutoff)),
      ),
    )
    .orderBy(desc(extractionJobs.createdAt));
}

export function toExtractionJobView(row: ExtractionJobRow, now: number = Date.now()): ExtractionJobView {
  const active = row.status === "pending" || row.status === "running";
  return {
    id: row.id,
    kind: row.kind as ExtractionJobKind,
    status: row.status as ExtractionJobView["status"],
    stage: row.stage,
    error: row.error,
    factCount: row.factCount,
    followUpCount: row.followUpCount,
    stalled: active && now - row.updatedAt.getTime() > EXTRACTION_STALLED_AFTER_MS,
  };
}

/**
 * Backstop for jobs a crash or function timeout left mid-flight: mark anything
 * active but untouched past the threshold as errored, so the UI offers a retry
 * instead of spinning forever. Runs on the default connection from the daily
 * cron — self-host-correct today; full multi-tenant scoping rides along with
 * the same packages/ee follow-up as the signals job.
 */
export async function reapStuckExtractionJobs(): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - EXTRACTION_REAP_AFTER_MS);
  const rows = await db
    .update(extractionJobs)
    .set({ status: "error", stage: null, error: "Timed out — retry.", updatedAt: new Date() })
    .where(and(inArray(extractionJobs.status, [...ACTIVE]), lt(extractionJobs.updatedAt, cutoff)))
    .returning({ id: extractionJobs.id });
  return rows.length;
}
