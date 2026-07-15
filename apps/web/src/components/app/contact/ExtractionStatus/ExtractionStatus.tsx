"use client";

import { useFormStatus } from "react-dom";
import { Loader2, RotateCw, TriangleAlert } from "lucide-react";
import { EXTRACTION_STAGE_LABELS } from "@/utils/constants/extraction-jobs";
import { retryExtractionJobAction } from "@/lib/actions/extraction-jobs";
import type { ExtractionJobView } from "@/types";
import { isActive, useExtractionPoller } from "./useExtractionPoller";

function activeLabel(job: ExtractionJobView): string {
  if (job.stage && EXTRACTION_STAGE_LABELS[job.stage]) {
    return EXTRACTION_STAGE_LABELS[job.stage];
  }
  return job.kind === "enrichment" ? "Enriching…" : "Queued — extracting facts…";
}

function RetryButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-full border border-red-400/40 px-2.5 py-1 text-xs text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
      Retry
    </button>
  );
}

export function ExtractionStatus({
  contactId,
  initialJobs,
}: {
  contactId: string;
  initialJobs: ExtractionJobView[];
}) {
  const jobs = useExtractionPoller(contactId, initialJobs);
  const visible = jobs.filter((j) => isActive(j) || j.status === "error");
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5" aria-live="polite">
      {visible.map((job) => {
        const stuck = job.status === "error" || job.stalled;
        if (stuck) {
          return (
            <div
              key={job.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-300"
            >
              <TriangleAlert className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                {job.kind === "enrichment" ? "Enrichment" : "Fact extraction"} didn’t finish
                {job.error ? ` — ${job.error}` : "."}
              </span>
              <form action={retryExtractionJobAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="contactId" value={contactId} />
                <RetryButton />
              </form>
            </div>
          );
        }
        return (
          <div
            key={job.id}
            className="flex items-center gap-2 rounded-lg border border-seam bg-panel px-3 py-2 text-xs text-fog"
          >
            <Loader2 className="size-3.5 shrink-0 animate-spin text-amber" />
            <span>{activeLabel(job)}</span>
          </div>
        );
      })}
    </div>
  );
}
