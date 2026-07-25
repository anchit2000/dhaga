import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { extractionJobs, type ExtractionJobRow } from "@/lib/db/schema";
import {
  EXTRACTION_JOB_RECENT_WINDOW_MS,
  EXTRACTION_STALLED_AFTER_MS,
} from "@/utils/constants/extraction-jobs";
import type { ExtractionJobKind, ExtractionJobView } from "@/types";
import { ACTIVE } from "./shared";

export async function getExtractionJob(id: string): Promise<ExtractionJobRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(extractionJobs).where(eq(extractionJobs.id, id)).limit(1);
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
