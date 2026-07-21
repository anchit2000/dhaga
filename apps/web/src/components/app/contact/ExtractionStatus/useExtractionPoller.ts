"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/lib/data";
import { EXTRACTION_POLL_INTERVAL_MS } from "@/utils/constants/extraction-jobs";
import type { ExtractionJobView, ExtractionStatusResponse } from "@/types";

export function isActive(job: ExtractionJobView): boolean {
  return job.status === "pending" || job.status === "running";
}

/** Changes whenever anything the client-side status UI shows moves — a
 *  status/stage transition or new fact/follow-up counts. Seeds the query key
 *  and re-sync against a fresh server render, NOT the full page refresh. */
function signature(jobs: ExtractionJobView[]): string {
  return jobs
    .map((j) => `${j.id}:${j.status}:${j.stage ?? ""}:${j.factCount}:${j.followUpCount}`)
    .join("|");
}

/**
 * The subset of job state the *server-rendered* page actually reflects: result
 * counts (FactList/FollowUpList/Timeline) and terminal status. Stage/running
 * transitions change only the client-side ExtractionStatus UI, so a full
 * `router.refresh()` — which re-runs the whole ~9-query person page — on every
 * stage tick is wasted server work that piled up DB load. Refresh only when new
 * facts/follow-ups have landed or a job finished.
 */
function refreshSignature(jobs: ExtractionJobView[]): string {
  return jobs
    .map((j) => `${j.id}:${isActive(j) ? "active" : j.status}:${j.factCount}:${j.followUpCount}`)
    .join("|");
}

/**
 * Drives background extraction from the page: fires the worker for pending
 * jobs, polls status while any are active (giving up after 5 straight
 * failures), and refreshes the server-rendered page whenever a job advances —
 * so the enrichment note, then the facts, then the follow-ups appear as they
 * land instead of after a manual reload.
 */
export function useExtractionPoller(
  contactId: string,
  initialJobs: ExtractionJobView[],
): ExtractionJobView[] {
  const router = useRouter();
  const initialSig = signature(initialJobs);
  const initialRefreshSig = refreshSignature(initialJobs);

  // The server's job set is part of the key: a materially different set (a
  // fresh enqueue or a retry re-render) seeds a new query and restarts
  // polling, replacing the old hand-rolled signature-sync effect.
  const { data } = useAsyncData<ExtractionJobView[]>({
    key: ["extraction-status", contactId, initialSig],
    fetcher: async (signal) => {
      const res = await fetch(`/api/contacts/${contactId}/extraction-status`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) throw new Error(`extraction status failed (${res.status})`);
      return ((await res.json()) as ExtractionStatusResponse).jobs;
    },
    initialData: initialJobs,
    staleMs: "forever",
    refetchIntervalMs: (jobs, consecutiveFailures) => {
      // A failed poll must not wipe the progress UI or stop the loop: keep
      // retrying through transient blips, giving up only after several
      // failures in a row (a genuinely unreachable endpoint).
      if (consecutiveFailures >= 5) return false;
      if (consecutiveFailures > 0) return EXTRACTION_POLL_INTERVAL_MS;
      return (jobs ?? []).some(isActive) ? EXTRACTION_POLL_INTERVAL_MS : false;
    },
  });
  const jobs = data ?? initialJobs;

  const trigger = useCallback((jobId: string) => {
    // Fire-and-forget: the worker's atomic claim dedupes double-fires, and
    // keepalive lets it survive the user navigating away right after submit.
    void fetch(`/api/jobs/extraction/run?jobId=${encodeURIComponent(jobId)}`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  // A fresh server-rendered job set is the new refresh baseline (the server
  // just painted it); only later poll-observed advances should refresh.
  const lastRefreshSig = useRef(initialRefreshSig);
  useEffect(() => {
    lastRefreshSig.current = initialRefreshSig;
  }, [initialRefreshSig]);

  useEffect(() => {
    for (const job of jobs) if (job.status === "pending") trigger(job.id);
    // Refresh on result/terminal changes only — not every stage tick (see
    // refreshSignature): the poller keeps the status UI live without re-running
    // the whole person page each 2s.
    const sig = refreshSignature(jobs);
    if (sig !== lastRefreshSig.current) {
      lastRefreshSig.current = sig;
      router.refresh();
    }
  }, [jobs, router, trigger]);

  return jobs;
}
