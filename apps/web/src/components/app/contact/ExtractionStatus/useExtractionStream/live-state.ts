import type { ExtractionJobStatus, ExtractionJobView, ExtractionStage } from "@/types";

/** Slow, bounded reconcile for the claim-lost case ONLY (a second tab whose
 *  worker POST lost the atomic claim). Deliberately slow so it never becomes the
 *  fast status poll the stream replaced — which is what fixed pool exhaustion. */
export const FALLBACK_POLL_INTERVAL_MS = 4500;
export const FALLBACK_POLL_MAX_MS = 120_000;

export function isActive(job: ExtractionJobView): boolean {
  return job.status === "pending" || job.status === "running";
}

export function isTerminalStatus(status: ExtractionJobStatus): boolean {
  return status === "done" || status === "error" || status === "blocked";
}

/** Narrow a persisted job stage to the live-state stage type. The DB only ever
 *  holds "searching"/"extracting" (or null); "writing" is stream-only. */
export function toStage(stage: string | null): ExtractionStage | null {
  return stage === "searching" || stage === "extracting" || stage === "writing"
    ? stage
    : null;
}

/** One job's row as the fallback status route (/api/contacts/[id]/extraction-status)
 *  returns it — enough for the slow path to drive the stage, detect terminal and
 *  show the same "done — N facts" summary the streaming path shows. */
export interface JobStatusRow {
  id: string;
  stage: string | null;
  status: ExtractionJobStatus;
  factCount: number;
  followUpCount: number;
}

/** Live, client-only state for one active job's stream: the current stage (which
 *  overrides the label) and, once a terminal event lands, the status it moved to
 *  — so a completed job's spinner stops and a blocked/error notice appears
 *  without a page refresh. `count` carries the fact total for the "writing" stage
 *  and, with `followUpCount`, the completion summary. */
export interface LiveJobState {
  stage: ExtractionStage | null;
  count: number;
  followUpCount: number;
  status: ExtractionJobStatus;
  error: string | null;
  /** Client-observed stall: the bounded fallback poll gave up without ever
   *  seeing a terminal status, so this tab is no longer watching the job. The
   *  spinner must become a Retry rather than spin forever claiming progress. */
  stalled: boolean;
}

export type LiveState = Record<string, LiveJobState>;
