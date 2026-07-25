import type {
  ExtractionJobStatus,
  ExtractionJobView,
  ExtractionStage,
  ExtractionStreamEvent,
} from "@/types";

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
 *  returns it — enough for the slow path to drive the stage and detect terminal. */
export interface JobStatusRow {
  id: string;
  stage: string | null;
  status: ExtractionJobStatus;
}

/** Live, client-only state for one active job's stream: the current stage (which
 *  overrides the label) and, once a terminal event lands, the status it moved to
 *  — so a completed job's spinner stops and a blocked/error notice appears
 *  without a page refresh. `count` carries the fact total for the "writing" stage. */
export interface LiveJobState {
  stage: ExtractionStage | null;
  count: number;
  status: ExtractionJobStatus;
  error: string | null;
}

export type LiveState = Record<string, LiveJobState>;

export function applyEvent(
  prev: LiveState,
  jobId: string,
  event: ExtractionStreamEvent,
): LiveState {
  const current = prev[jobId];
  switch (event.type) {
    case "stage":
      return {
        ...prev,
        [jobId]: {
          status: "running",
          stage: event.stage,
          count: event.count ?? current?.count ?? 0,
          error: null,
        },
      };
    case "done":
      return {
        ...prev,
        [jobId]: { status: "done", stage: null, count: event.factCount, error: null },
      };
    case "blocked":
      return {
        ...prev,
        [jobId]: { status: "blocked", stage: null, count: 0, error: event.message },
      };
    case "error":
      return {
        ...prev,
        [jobId]: { status: "error", stage: null, count: 0, error: event.message },
      };
    case "detached":
      // Nothing to render here — the fallback poll the effect starts on this
      // event drives the job's stage/terminal state from the DB instead.
      return prev;
  }
}

/** Fold a fallback status-poll row into live state — the slow-path analogue of
 *  applyEvent. `error` isn't carried by the status route, so a fallback-observed
 *  error keeps whatever the server render / prior events had. */
export function applyStatus(prev: LiveState, jobId: string, row: JobStatusRow): LiveState {
  const current = prev[jobId];
  return {
    ...prev,
    [jobId]: {
      status: row.status,
      stage: toStage(row.stage),
      count: current?.count ?? 0,
      error: current?.error ?? null,
    },
  };
}
