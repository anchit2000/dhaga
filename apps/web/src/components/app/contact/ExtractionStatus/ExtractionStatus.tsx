"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Loader2, RotateCw, Sparkles, TriangleAlert } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import {
  EXTRACTION_BLOCKED_LABEL,
  EXTRACTION_STAGE_LABELS,
} from "@/utils/constants/extraction-jobs";
import { retryExtractionJobAction } from "@/lib/actions/extraction-jobs";
import type { ExtractionJobView } from "@/types";
import { extractionDoneMessage, isVisible, useExtractionStream } from "./useExtractionStream";

function activeLabel(job: ExtractionJobView): string {
  // "writing" is a stream-only stage carrying the final fact count.
  if (job.stage === "writing") {
    return `Writing ${job.factCount} ${job.factCount === 1 ? "fact" : "facts"}…`;
  }
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
      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
      Retry
    </button>
  );
}

export function ExtractionStatus({
  contactId,
  initialJobs,
  onFacts,
}: {
  contactId: string;
  initialJobs: ExtractionJobView[];
  /** Called when the stream reports a job wrote new facts — the Facts panel
   *  refetches instead of the whole page refreshing. */
  onFacts: () => void;
}) {
  const visible = useExtractionStream(initialJobs, onFacts).filter(isVisible);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5" aria-live="polite">
      {visible.map((job) => {
        // No AI budget: a calm, non-retryable paid-feature notice — never the
        // red error styling, and no Retry (retrying can't succeed without a
        // plan). The poller already treats "blocked" as terminal and stops.
        if (job.status === "blocked") {
          return (
            <div
              key={job.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber/25 bg-amber/[0.05] px-3 py-2 text-xs text-fog"
            >
              <Sparkles className="size-3.5 shrink-0 text-ember" />
              <span className="min-w-0 flex-1">{EXTRACTION_BLOCKED_LABEL}</span>
              <Link
                href="/app/settings"
                className="shrink-0 font-medium text-ember transition-colors hover:underline"
              >
                Upgrade
              </Link>
            </div>
          );
        }
        const stuck = job.status === "error" || job.stalled;
        if (stuck) {
          return (
            <div
              key={job.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              <TriangleAlert className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                {job.kind === "enrichment" ? "Enrichment" : "Fact extraction"} didn’t finish
                {job.error ? ` — ${job.error}` : "."}
              </span>
              <ActionForm
                action={retryExtractionJobAction}
                errorMessage="Couldn't retry extraction — try again."
              >
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="contactId" value={contactId} />
                <RetryButton />
              </ActionForm>
            </div>
          );
        }
        // Finished: a plain receipt of what landed, in the same quiet pill the
        // spinner used, so completion isn't just the spinner vanishing. The hook
        // only keeps this for a job this session watched finish, and clears it
        // after EXTRACTION_DONE_NOTICE_MS — never a permanent banner.
        if (job.status === "done") {
          return (
            <div
              key={job.id}
              className="flex items-center gap-2 rounded-lg border border-seam bg-panel px-3 py-2 text-xs text-fog"
            >
              <Check className="size-3.5 shrink-0 text-ember" />
              <span>{extractionDoneMessage(job)}</span>
            </div>
          );
        }
        return (
          <div
            key={job.id}
            className="flex items-center gap-2 rounded-lg border border-seam bg-panel px-3 py-2 text-xs text-fog"
          >
            <Loader2 className="size-3.5 shrink-0 animate-spin text-ember" />
            <span>{activeLabel(job)}</span>
          </div>
        );
      })}
    </div>
  );
}
