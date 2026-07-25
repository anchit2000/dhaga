"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  applyEvent,
  applyStatus,
  FALLBACK_POLL_INTERVAL_MS,
  FALLBACK_POLL_MAX_MS,
  isActive,
  isTerminalStatus,
} from "./live-state";
import { streamJob } from "./stream";
import type { ExtractionJobView } from "@/types";
import type { JobStatusRow, LiveState } from "./live-state";

export { isActive } from "./live-state";

/**
 * Streams background extraction progress into the person page. For each active
 * job it opens ONE POST to the worker route and reads the NDJSON events, driving
 * the active-job label live and calling `onFacts` when a job reports it finished
 * writing facts — so the facts refresh without the old 2s status poll or the
 * whole-page router.refresh() this replaces. Returns the server-rendered jobs
 * merged with live state: a finished job drops out of the active set, while a
 * blocked/error transition surfaces its notice in place.
 *
 * Claim-lost fallback: if the worker POST loses the atomic claim (a second tab —
 * the stream emits `detached`) or the stream ends with no terminal event, this
 * tab reconciles via a SLOW, bounded poll of the status route so it still
 * reflects completion (and refreshes facts) without a manual reload.
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

  // False once unmounted, so the bounded fallback loop stops instead of firing
  // requests (and setState) into a dead component.
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
  // Jobs already handed to the fallback poll — dedupe the detached / no-terminal
  // triggers so each job is reconciled by at most one loop.
  const fallbackStarted = useRef<Set<string>>(new Set());

  const startFallbackPoll = useCallback(
    (jobId: string): void => {
      if (!contactId || fallbackStarted.current.has(jobId)) return;
      fallbackStarted.current.add(jobId);
      const deadline = Date.now() + FALLBACK_POLL_MAX_MS;
      const tick = async (): Promise<void> => {
        if (!mountedRef.current) return;
        try {
          const response = await fetch(
            `/api/contacts/${encodeURIComponent(contactId)}/extraction-status`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const rows = (await response.json()) as JobStatusRow[];
            const row = rows.find((r) => r.id === jobId);
            if (!row) return; // aged out of the recent window / gone — stop
            setLive((prev) => applyStatus(prev, jobId, row));
            if (isTerminalStatus(row.status)) {
              if (row.status === "done") onFactsRef.current();
              return; // terminal — stop
            }
          }
        } catch {
          // Transient network error: keep trying until the deadline.
        }
        if (!mountedRef.current || Date.now() >= deadline) return;
        setTimeout(() => void tick(), FALLBACK_POLL_INTERVAL_MS);
      };
      void tick();
    },
    [contactId],
  );

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
        if (event.type === "done") onFactsRef.current();
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
  }, [initialJobs, startFallbackPoll]);

  return initialJobs.map((job) => {
    const l = live[job.id];
    if (!l) return job;
    return {
      ...job,
      status: l.status,
      stage: l.stage,
      error: l.error ?? job.error,
      factCount: l.stage === "writing" ? l.count : job.factCount,
    };
  });
}
