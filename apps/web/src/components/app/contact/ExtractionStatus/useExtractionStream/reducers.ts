import { isTerminalStatus, toStage } from "./live-state";
import type { ExtractionStreamEvent } from "@/types";
import type { JobStatusRow, LiveState } from "./live-state";

/**
 * Every stream event folds into live state — including the terminal ones. That
 * is what stops a finished job's spinner: the page's server-rendered job list
 * still says pending/running until the next revalidation, so if a "done"/"error"
 * /"blocked" event did not land here the pill would keep claiming work is in
 * flight until a manual reload.
 */
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
          followUpCount: current?.followUpCount ?? 0,
          error: null,
          stalled: false,
        },
      };
    case "done":
      return {
        ...prev,
        [jobId]: {
          status: "done",
          stage: null,
          count: event.factCount,
          followUpCount: event.followUpCount,
          error: null,
          stalled: false,
        },
      };
    case "blocked":
      return {
        ...prev,
        [jobId]: {
          status: "blocked",
          stage: null,
          count: 0,
          followUpCount: 0,
          error: event.message,
          stalled: false,
        },
      };
    case "error":
      return {
        ...prev,
        [jobId]: {
          status: "error",
          stage: null,
          count: 0,
          followUpCount: 0,
          error: event.message,
          stalled: false,
        },
      };
    case "detached":
      // Nothing to render here — the fallback poll the effect starts on this
      // event drives the job's stage/terminal state from the DB instead.
      return prev;
  }
}

/** Fold a fallback status-poll row into live state — the slow-path analogue of
 *  applyEvent. `error` isn't carried by the status route, so a fallback-observed
 *  error keeps whatever the server render / prior events had. Counts are only
 *  trusted once the row is done (they read 0 until then, and a live "writing"
 *  count must not regress to 0). */
export function applyStatus(prev: LiveState, jobId: string, row: JobStatusRow): LiveState {
  const current = prev[jobId];
  const finished = row.status === "done";
  return {
    ...prev,
    [jobId]: {
      status: row.status,
      stage: toStage(row.stage),
      count: finished ? row.factCount : (current?.count ?? 0),
      followUpCount: finished ? row.followUpCount : (current?.followUpCount ?? 0),
      error: current?.error ?? null,
      stalled: false,
    },
  };
}

/** This tab stopped watching a job that never reported a terminal state (the
 *  bounded poll hit its deadline, or the row aged out of the recent window).
 *  Keeps whatever progress we saw but flags it stalled, which renders the Retry
 *  notice instead of a spinner that would otherwise run until a manual reload.
 *  A job that already finished is left alone. */
export function markStalled(prev: LiveState, jobId: string): LiveState {
  const current = prev[jobId];
  if (current && isTerminalStatus(current.status)) return prev;
  return {
    ...prev,
    [jobId]: {
      status: current?.status ?? "running",
      stage: current?.stage ?? null,
      count: current?.count ?? 0,
      followUpCount: current?.followUpCount ?? 0,
      error: current?.error ?? null,
      stalled: true,
    },
  };
}
