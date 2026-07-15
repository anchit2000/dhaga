"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { retryExtractionJob } from "@/lib/repo/extraction-jobs";

/**
 * Re-queue a failed or stalled job. Deliberately does NOT run the work here —
 * that would block this submit for the full LLM duration, the very thing the
 * background model exists to avoid. It flips the job back to pending; the
 * page's poller notices and fires the worker route, exactly as for a new job.
 */
export async function retryExtractionJobAction(formData: FormData): Promise<void> {
  await requireUserId();
  const jobId = String(formData.get("jobId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!jobId) return;
  await retryExtractionJob(jobId);
  revalidatePath(`/app/people/${contactId}`);
}
