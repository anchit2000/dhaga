"use client";

import { useCallback, useRef } from "react";
import {
  FALLBACK_POLL_INTERVAL_MS,
  FALLBACK_POLL_MAX_MS,
  isTerminalStatus,
} from "./live-state";
import type { RefObject } from "react";
import type { JobStatusRow } from "./live-state";

/**
 * Slow, bounded reconcile for a job this tab can't stream (a second tab won the
 * atomic claim, or the stream died before reporting a terminal event). Returns a
 * starter that runs at most one loop per job.
 *
 * Two exits, and BOTH have to be told to the caller: a terminal row (via `onRow`)
 * or giving up — the deadline, or a row that aged out of the recent window. A
 * silent give-up used to leave the job's spinner running forever, so `onGiveUp`
 * is how the UI turns that into a retryable notice instead of a lie.
 */
export function useFallbackPoll(
  contactId: string | null,
  mountedRef: RefObject<boolean>,
  onRow: (jobId: string, row: JobStatusRow) => void,
  onGiveUp: (jobId: string) => void,
): (jobId: string) => void {
  // Deduped: the detached / no-terminal / aborted triggers can all fire for the
  // same job, and each must reconcile through at most one loop.
  const started = useRef<Set<string>>(new Set());

  return useCallback(
    (jobId: string): void => {
      if (!contactId || started.current.has(jobId)) return;
      started.current.add(jobId);
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
            if (!row) {
              onGiveUp(jobId); // aged out of the recent window / gone
              return;
            }
            onRow(jobId, row);
            if (isTerminalStatus(row.status)) return;
          }
        } catch {
          // Transient network error: keep trying until the deadline.
        }
        if (!mountedRef.current) return;
        if (Date.now() >= deadline) {
          onGiveUp(jobId);
          return;
        }
        setTimeout(() => void tick(), FALLBACK_POLL_INTERVAL_MS);
      };
      void tick();
    },
    [contactId, mountedRef, onRow, onGiveUp],
  );
}
