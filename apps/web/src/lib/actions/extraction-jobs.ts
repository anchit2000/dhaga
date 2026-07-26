"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { retryExtractionJob } from "@/lib/repo/extraction-jobs";

/**
 * Re-queue a failed or stalled job. Deliberately does NOT run the work here —
 * that would block this submit for the full LLM duration, the very thing the
 * background model exists to avoid. It flips the job back to pending; the
 * page's poller notices and fires the worker route, exactly as for a new job.
 */
export async function retryExtractionJobAction(formData: FormData): Promise<void> {
  const jobId = String(formData.get("jobId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!jobId) return;
  const r = await mutation("retryExtractionJob", () => retryExtractionJob(jobId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}
