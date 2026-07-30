"use client";

import { useCallback, useRef, useState } from "react";
import { toastSuccess } from "@/components/app/feedback";
import { EXTRACTION_DONE_NOTICE_MS } from "@/utils/constants/extraction-jobs";
import type { RefObject } from "react";

/**
 * Announcing a finished job, in-session. Two surfaces, one per problem:
 *
 * - a toast, because the status pill sits beside the facts and is easy to miss
 *   while you're typing the next note (`announce` carries the message, or null
 *   when this tab can't claim the user started the job here);
 * - `cleared`, the ids whose in-page confirmation has had its moment, so the
 *   pill reads as a receipt that tidies itself rather than a standing banner.
 */
export function useJobConfirmations(mountedRef: RefObject<boolean>): {
  cleared: ReadonlySet<string>;
  confirm: (jobId: string, announce: string | null) => void;
} {
  const [cleared, setCleared] = useState<ReadonlySet<string>>(() => new Set<string>());
  // A job settles through exactly one toast even when the stream and the
  // fallback poll both observe it finishing.
  const announced = useRef<Set<string>>(new Set());

  const confirm = useCallback(
    (jobId: string, announce: string | null): void => {
      if (announce && !announced.current.has(jobId)) {
        announced.current.add(jobId);
        toastSuccess(announce);
      }
      setTimeout(() => {
        if (!mountedRef.current) return;
        setCleared((prev) => new Set(prev).add(jobId));
      }, EXTRACTION_DONE_NOTICE_MS);
    },
    [mountedRef],
  );

  return { cleared, confirm };
}
