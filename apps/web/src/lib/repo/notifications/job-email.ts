import { eq } from "drizzle-orm";
import { getDb as getGlobalDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/request-scope";
import { emailEnabled, ownerEmail, sendEmail } from "@/lib/email/send";
import { jobNotificationHtml } from "@/lib/email/job-notification";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import {
  getJobEmailLastSentAt,
  isJobEmailNotificationsEnabled,
  setJobEmailLastSentAt,
} from "@/lib/repo/suggestion-settings";
import { JOB_EMAIL_COOLDOWN_MINUTES } from "@/utils/constants/notifications";
import type { JobNotificationCopy, JobOutcome } from "./job-copy";

/** What the send needs, computed inside the caller's scope and carried out of it. */
export interface JobEmailPlan {
  subject: string;
  html: string;
}

/**
 * THE VOLUME RULE — pure, so it is unit-testable without a DB.
 *
 * 1. A job that SUCCEEDED is never emailed. It asks nothing of the user and its
 *    result is already in the app; the in-app notification (written for every
 *    job, always) is the record. Emailing each one would put five emails in an
 *    inbox for five notes pasted in a row — the surest way to get the whole
 *    channel muted, taking the failures down with it.
 * 2. A job that FAILED or was BLOCKED is emailed: those are the outcomes where
 *    not knowing costs something (a note whose facts silently never landed, work
 *    to retry, a budget to raise) and the user may well have left the app.
 * 3. Even those are capped at one email per JOB_EMAIL_COOLDOWN_MINUTES, because
 *    the usual cause of a failure — a bad key, an outage, an exhausted budget —
 *    fails every queued job at once.
 */
export function shouldEmailJobOutcome(
  outcome: JobOutcome,
  opts: { lastSentAt: number | null; now: number },
): boolean {
  if (outcome.status === "done") return false;
  if (opts.lastSentAt === null) return true;
  return opts.now - opts.lastSentAt >= JOB_EMAIL_COOLDOWN_MINUTES * 60_000;
}

/**
 * Decide whether this outcome earns an email and pre-render it. DB READS ONLY —
 * called from inside the notification's already-open `withUserDb` scope so the
 * opt-in and the cooldown are read on the connection that is already checked
 * out, and no network call happens while it is held.
 *
 * Returns null (no email) when email isn't configured at all, when the user
 * hasn't opted in, or when the volume rule suppresses it.
 */
export async function planJobEmail(
  outcome: JobOutcome,
  copy: JobNotificationCopy,
  contactId: string,
  now: number,
): Promise<JobEmailPlan | null> {
  // Cheapest gate first: an instance with no Resend config does zero extra
  // queries, so notifyJobOutcome behaves exactly as it did before this feature.
  if (!emailEnabled()) return null;
  if (!(await isJobEmailNotificationsEnabled())) return null;
  if (!shouldEmailJobOutcome(outcome, { lastSentAt: await getJobEmailLastSentAt(), now })) {
    return null;
  }
  const contactUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app/people/${contactId}`;
  // Subject IS the notification title — one wording for one event (job-copy).
  return { subject: copy.title, html: jobNotificationHtml(copy, { contactUrl }) };
}

/** The account email for a user, or the configured owner in self-host. Read from
 *  the core (non-RLS) auth table on the plain global connection, exactly as
 *  hosted/tenants.ts enumerates tenants. */
async function recipientFor(userId: string): Promise<string | null> {
  const db = await getGlobalDb();
  const [row] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);
  return row?.email ?? ownerEmail();
}

/**
 * Send a planned job email — BEST EFFORT, and deliberately NOT inside any DB
 * scope. Call it only after the caller's `withUserDb` block has committed and
 * released.
 *
 * Two rules this exists to keep:
 * - No connection is ever held across the network call. Holding one across an
 *   HTTP request to Resend is what exhausted the tenant pool in production; the
 *   sequence here is scoped-read (planJobEmail) → scope closed → send → a second
 *   short scoped write, mirroring jobs/follow-up-reminders' sweepUser.
 * - Nothing here can fail the job. Every failure — recipient lookup, Resend,
 *   the cooldown write — is swallowed and logged PII-safe: feature tag plus an
 *   error code/name only, never the recipient, the subject or the body (the copy
 *   embeds a contact name).
 *
 * The cooldown stamp is written only on a SUCCESSFUL send, so a bounced attempt
 * doesn't silence the next 15 minutes.
 */
export async function deliverJobEmail(
  userId: string,
  plan: JobEmailPlan,
  now: number,
): Promise<void> {
  try {
    const recipient = await recipientFor(userId);
    if (!recipient) return;
    // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
    if (isDummyAccount({ id: userId, email: recipient })) return;

    const result = await sendEmail({ to: recipient, subject: plan.subject, html: plan.html });
    if (!result.ok) return;

    await withUserDb(userId, () => setJobEmailLastSentAt(now));
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const name = error instanceof Error ? error.name : typeof error;
    console.error("[notifications] job email failed", { code, name });
  }
}
