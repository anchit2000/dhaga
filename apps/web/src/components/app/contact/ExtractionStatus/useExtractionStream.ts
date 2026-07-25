"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ExtractionJobStatus,
  ExtractionJobView,
  ExtractionStage,
  ExtractionStreamEvent,
} from "@/types";

export function isActive(job: ExtractionJobView): boolean {
  return job.status === "pending" || job.status === "running";
}

/** Live, client-only state for one active job's stream: the current stage (which
 *  overrides the label) and, once a terminal event lands, the status it moved to
 *  — so a completed job's spinner stops and a blocked/error notice appears
 *  without a page refresh. `count` carries the fact total for the "writing" stage. */
interface LiveJobState {
  stage: ExtractionStage | null;
  count: number;
  status: ExtractionJobStatus;
  error: string | null;
}

type LiveState = Record<string, LiveJobState>;

function applyEvent(prev: LiveState, jobId: string, event: ExtractionStreamEvent): LiveState {
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
  }
}

/** Fire-and-read one job: the same POST both claims the job (the atomic claim
 *  dedupes a double-fire) and streams its NDJSON progress. keepalive lets the
 *  worker run to completion even if the user navigates away mid-extraction. */
async function streamJob(
  jobId: string,
  onEvent: (event: ExtractionStreamEvent) => void,
): Promise<void> {
  const response = await fetch(
    `/api/jobs/extraction/run?jobId=${encodeURIComponent(jobId)}`,
    { method: "POST", keepalive: true },
  );
  if (!response.ok || !response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as ExtractionStreamEvent);
      newline = buffer.indexOf("\n");
    }
  }
}

/**
 * Streams background extraction progress into the person page. For each active
 * job it opens ONE POST to the worker route and reads the NDJSON events, driving
 * the active-job label live and calling `onFacts` when a job reports it finished
 * writing facts — so the facts refresh without the old 2s status poll or the
 * whole-page router.refresh() this replaces. Returns the server-rendered jobs
 * merged with live state: a finished job drops out of the active set, while a
 * blocked/error transition surfaces its notice in place.
 */
export function useExtractionStream(
  initialJobs: ExtractionJobView[],
  onFacts: () => void,
): ExtractionJobView[] {
  const [live, setLive] = useState<LiveState>({});
  // Keep the latest onFacts without making it an effect dependency (a fresh
  // closure each render must not re-run — and re-fire — the stream effect).
  const onFactsRef = useRef(onFacts);
  useEffect(() => {
    onFactsRef.current = onFacts;
  }, [onFacts]);

  // Jobs we've already opened a stream for — dedupe re-renders (and React
  // StrictMode's double-invoke) so the worker is fired at most once per job.
  const started = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const job of initialJobs) {
      if (!isActive(job) || started.current.has(job.id)) continue;
      started.current.add(job.id);
      void streamJob(job.id, (event) => {
        setLive((prev) => applyEvent(prev, job.id, event));
        if (event.type === "done") onFactsRef.current();
      }).catch(() => {
        // Aborted navigation or a network blip: leave the last live state in
        // place; the server-rendered status stays authoritative on the next render.
      });
    }
  }, [initialJobs]);

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
