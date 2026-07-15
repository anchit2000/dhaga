"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EXTRACTION_POLL_INTERVAL_MS } from "@/utils/constants/extraction-jobs";
import type { ExtractionJobView, ExtractionStatusResponse } from "@/types";

export function isActive(job: ExtractionJobView): boolean {
  return job.status === "pending" || job.status === "running";
}

/** Changes exactly when something worth re-rendering the page for happened:
 *  a status/stage transition, or new fact/follow-up counts. */
function signature(jobs: ExtractionJobView[]): string {
  return jobs
    .map((j) => `${j.id}:${j.status}:${j.stage ?? ""}:${j.factCount}:${j.followUpCount}`)
    .join("|");
}

/**
 * Drives background extraction from the page: fires the worker for pending
 * jobs, polls status while any are active, and refreshes the server-rendered
 * page whenever a job advances — so the enrichment note, then the facts, then
 * the follow-ups appear as they land instead of after a manual reload.
 */
export function useExtractionPoller(
  contactId: string,
  initialJobs: ExtractionJobView[],
): ExtractionJobView[] {
  const router = useRouter();
  const [jobs, setJobs] = useState<ExtractionJobView[]>(initialJobs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const polling = useRef(false);
  const failures = useRef(0);
  const lastSig = useRef(signature(initialJobs));
  const pollRef = useRef<() => void>(() => {});

  const trigger = useCallback((jobId: string) => {
    // Fire-and-forget: the worker's atomic claim dedupes double-fires, and
    // keepalive lets it survive the user navigating away right after submit.
    void fetch(`/api/jobs/extraction/run?jobId=${encodeURIComponent(jobId)}`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  // Schedule the next tick through a ref so the self-rescheduling loop always
  // calls the latest `poll` without capturing it before it's declared.
  const scheduleNext = useCallback(() => {
    timer.current = setTimeout(() => void pollRef.current(), EXTRACTION_POLL_INTERVAL_MS);
  }, []);

  const poll = useCallback(async () => {
    let next: ExtractionJobView[] | null = null;
    try {
      const res = await fetch(`/api/contacts/${contactId}/extraction-status`, {
        cache: "no-store",
      });
      if (res.ok) next = ((await res.json()) as ExtractionStatusResponse).jobs;
    } catch {
      // transient network blip — handled below
    }

    // A failed poll must not wipe the progress UI or stop the loop: keep the
    // last known jobs and retry, giving up only after several failures in a
    // row (a genuinely unreachable endpoint).
    if (next === null) {
      failures.current += 1;
      if (failures.current < 5) {
        scheduleNext();
      } else {
        polling.current = false;
      }
      return;
    }
    failures.current = 0;

    setJobs(next);
    const sig = signature(next);
    if (sig !== lastSig.current) {
      lastSig.current = sig;
      router.refresh();
    }
    for (const job of next) if (job.status === "pending") trigger(job.id);
    if (next.some(isActive)) {
      scheduleNext();
    } else {
      polling.current = false;
    }
  }, [contactId, router, trigger, scheduleNext]);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const ensurePolling = useCallback(() => {
    if (polling.current) return;
    polling.current = true;
    scheduleNext();
  }, [scheduleNext]);

  // Sync state to the server's job set during render (React's alternative to
  // calling setState in an effect) whenever it materially changes.
  const initialSig = signature(initialJobs);
  const [prevInitialSig, setPrevInitialSig] = useState(initialSig);
  if (initialSig !== prevInitialSig) {
    setPrevInitialSig(initialSig);
    setJobs(initialJobs);
  }

  useEffect(() => {
    lastSig.current = initialSig;
    for (const job of initialJobs) if (job.status === "pending") trigger(job.id);
    if (initialJobs.some(isActive)) ensurePolling();
    // Re-run only when the server hands us a materially different job set
    // (a fresh enqueue or a retry re-render), not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return jobs;
}
