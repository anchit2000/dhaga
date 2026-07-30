"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { isActive, isTerminalStatus } from "./live-state";
import { applyEvent, applyStatus, markStalled } from "./reducers";
import { extractionDoneMessage } from "./done-message";
import { mergeLiveState } from "./merge";
import { streamJob } from "./stream";
import { useFallbackPoll } from "./use-fallback-poll";
import { useJobConfirmations } from "./use-confirmations";
import type { ExtractionJobView } from "@/types";
import type { JobStatusRow, LiveState } from "./live-state";

export { isVisible } from "./merge";
export { extractionDoneMessage } from "./done-message";

/**
 * Streams background extraction progress into the person page. For each active
 * job it opens ONE POST to the worker route and reads the NDJSON events, driving
 * the active-job label live and calling `onFacts` when a job reports it finished
 * writing facts — so the facts refresh without the old 2s status poll or the
 * whole-page router.refresh() this replaces. Returns the server-rendered jobs
 * merged with live state: a finished job keeps a brief "done — N facts added"
 * confirmation and then clears itself, while a blocked/error/stalled transition
 * surfaces its notice in place. EVERY terminal outcome settles here, because the
 * server-rendered list is stale until the next revalidation — that is what stops
 * a finished job spinning "extracting…" until a manual reload.
 *
 * Claim-lost fallback: if the worker POST loses the atomic claim (a second tab —
 * the stream emits `detached`) or the stream ends with no terminal event, this
 * tab reconciles via a SLOW, bounded poll of the status route. When even that
 * gives up, the job is flagged stalled (a retryable notice), never left spinning.
 */
export function useExtractionStream(
  initialJobs: ExtractionJobView[],
  onFacts: () => void,
): ExtractionJobView[] {
  const [live, setLive] = useState<LiveState>({});
  // The person page is /app/people/[id], where [id] === contactId — the key the
  // fallback status route is scoped by. Read it here rather than plumb a new prop.
  const params = useParams();
  const contactId = typeof params.id === "string" ? params.id : null;

  // Keep the latest onFacts without making it an effect dependency (a fresh
  // closure each render must not re-run — and re-fire — the stream effect).
  const onFactsRef = useRef(onFacts);
  useEffect(() => {
    onFactsRef.current = onFacts;
  }, [onFacts]);

  // False once unmounted, so the bounded fallback loop and the confirmation
  // timers stop instead of firing requests (and setState) into a dead component.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Jobs we've already opened a stream for — dedupe re-renders (and React
  // StrictMode's double-invoke) so the worker is fired at most once per job.
  const started = useRef<Set<string>>(new Set());
  const { cleared, confirm } = useJobConfirmations(mountedRef);

  const settleDone = useCallback(
    (jobId: string, announce: string | null): void => {
      onFactsRef.current();
      confirm(jobId, announce);
    },
    [confirm],
  );

  const onPolledRow = useCallback(
    (jobId: string, row: JobStatusRow): void => {
      setLive((prev) => applyStatus(prev, jobId, row));
      // No toast on this path: another tab owns the job, so this one can't claim
      // the user started it here. The in-page confirmation still shows.
      if (row.status === "done") settleDone(jobId, null);
      else if (isTerminalStatus(row.status)) onFactsRef.current();
    },
    [settleDone],
  );

  const onPollGaveUp = useCallback((jobId: string): void => {
    setLive((prev) => markStalled(prev, jobId));
  }, []);

  const startFallbackPoll = useFallbackPoll(contactId, mountedRef, onPolledRow, onPollGaveUp);

  useEffect(() => {
    for (const job of initialJobs) {
      if (!isActive(job) || started.current.has(job.id)) continue;
      started.current.add(job.id);
      const jobId = job.id;
      let sawTerminal = false;
      void streamJob(jobId, (event) => {
        if (event.type === "detached") {
          // The owning tab claimed the job; this stream has nothing to report —
          // reconcile via the slow fallback poll.
          startFallbackPoll(jobId);
          return;
        }
        setLive((prev) => applyEvent(prev, jobId, event));
        if (event.type === "done") {
          // This tab's POST ran the worker, so the user did start it here:
          // announce it with the counts the job actually recorded.
          settleDone(
            jobId,
            extractionDoneMessage({
              kind: job.kind,
              factCount: event.factCount,
              followUpCount: event.followUpCount,
            }),
          );
        }
        if (event.type === "done" || event.type === "error" || event.type === "blocked") {
          sawTerminal = true;
        }
      })
        .then(() => {
          // Stream closed with no terminal event (a failed worker POST or a
          // dropped connection): reconcile via the fallback poll.
          if (!sawTerminal) startFallbackPoll(jobId);
        })
        .catch(() => {
          // Aborted navigation or a mid-stream network blip: reconcile via the
          // fallback poll (deduped, bounded, and stops on unmount).
          startFallbackPoll(jobId);
        });
    }
  }, [initialJobs, startFallbackPoll, settleDone]);

  return mergeLiveState(initialJobs, live, cleared);
}
