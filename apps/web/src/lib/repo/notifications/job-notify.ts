import { eq } from "drizzle-orm";
import { getDb, withUserDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createNotification } from "./mutations";
import { buildJobNotification, type JobOutcome } from "./job-copy";
import { deliverJobEmail, planJobEmail, type JobEmailPlan } from "./job-email";

/** The bits of the job row the notification needs — nothing more, so the
 *  worker can pass a claimed job or a reconstructed one. */
export interface JobNotificationSubject {
  jobId: string;
  contactId: string;
  kind: JobOutcome["kind"];
}

async function contactName(contactId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ name: contacts.name })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  return row?.name ?? null;
}

/**
 * Record the "your background job finished" notification — BEST EFFORT.
 *
 * Two deliberate properties:
 *
 * 1. It runs in its OWN short `withUserDb` scope, opened AFTER the job-status
 *    scope has committed and released — sequential, never a second concurrent
 *    checkout, so it does not fan out the small tenant pool (the same
 *    short-scope pattern the rest of this worker uses around the LLM call).
 *    It CANNOT share the status write's scope: under EE that scope is one
 *    transaction, so a failing INSERT here would abort it and roll the job
 *    status back — leaving the job stuck "running" until the reaper errors it.
 *    A notification must never be able to fail the job.
 * 2. Every failure is swallowed and logged PII-safe (feature + error code/name
 *    only — the title embeds a contact name, so the copy is never logged).
 *
 * The optional email rides the SAME copy (so the bell and the inbox can never
 * word one event two ways) and is strictly sequential to the DB work: the scope
 * above decides and pre-renders it (reads only, see planJobEmail), then closes,
 * and only then does deliverJobEmail touch the network — a connection is never
 * held across a send. It is opt-in (default off), volume-capped, and equally
 * best-effort: an email that can't be sent leaves both the job and the
 * notification that was already written untouched.
 */
export async function notifyJobOutcome(
  userId: string,
  subject: JobNotificationSubject,
  outcome: JobOutcome,
): Promise<void> {
  const now = Date.now();
  let plan: JobEmailPlan | null = null;
  try {
    plan = await withUserDb(userId, async () => {
      const copy = buildJobNotification(outcome, await contactName(subject.contactId));
      await createNotification({
        type: copy.type,
        title: copy.title,
        body: copy.body,
        contactId: subject.contactId,
        jobId: subject.jobId,
      });
      return planJobEmail(outcome, copy, subject.contactId, now);
    });
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const name = error instanceof Error ? error.name : typeof error;
    console.error("[notifications] job notification write failed", { code, name });
    // No email either: under EE that scope is one transaction, so a failed
    // INSERT has aborted the reads the plan would have been built from.
  }

  // Scope closed and connection released before any network I/O.
  if (plan) await deliverJobEmail(userId, plan, now);
}
