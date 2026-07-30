import { isActive } from "./live-state";
import type { ExtractionJobView } from "@/types";
import type { LiveState } from "./live-state";

/**
 * Fold this tab's live stream state over the server-rendered job list, and drop
 * the rows there is nothing honest to say about.
 *
 * Live wins over the server render, because the server list is a snapshot from
 * before the worker ran: a job whose stream reported "done" must render as done
 * (its spinner stops) without waiting for a revalidation or a manual reload.
 *
 * A job the server already shows as done but that this tab never watched is
 * dropped — it finished in another session, so a confirmation here would be news
 * about nothing. `cleared` drops the ones whose brief confirmation has timed out.
 */
export function mergeLiveState(
  initialJobs: ExtractionJobView[],
  live: LiveState,
  cleared: ReadonlySet<string>,
): ExtractionJobView[] {
  const rows: ExtractionJobView[] = [];
  for (const job of initialJobs) {
    const l = live[job.id];
    const view: ExtractionJobView = l
      ? {
          ...job,
          status: l.status,
          stage: l.stage,
          error: l.error ?? job.error,
          factCount: l.status === "done" || l.stage === "writing" ? l.count : job.factCount,
          followUpCount: l.status === "done" ? l.followUpCount : job.followUpCount,
          // Live state is the fresher signal: the server's `stalled` was computed
          // at render time and can't know this stream is healthy (or has since
          // given up).
          stalled: l.stalled,
        }
      : job;
    if (view.status === "done" && (!l || cleared.has(job.id))) continue;
    rows.push(view);
  }
  return rows;
}

/** Rows worth showing: work in flight, a problem to act on, or the brief
 *  completion confirmation (mergeLiveState already limited "done" to jobs this
 *  session watched finish). */
export function isVisible(job: ExtractionJobView): boolean {
  return (
    isActive(job) ||
    job.status === "error" ||
    job.status === "blocked" ||
    job.status === "done"
  );
}
