import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { extractionJobs } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { completeExtractionJob, createExtractionJob } from "@/lib/repo/extraction-jobs";
import {
  listRecentNotifications,
  notifyJobOutcome,
  shouldEmailJobOutcome,
  type JobNotificationSubject,
} from "@/lib/repo/notifications";
import { setJobEmailNotificationsEnabled } from "@/lib/repo/suggestion-settings";
import { setSetting } from "@/lib/repo/settings";
import { JOB_EMAIL_COOLDOWN_MINUTES } from "@/utils/constants/notifications";
import { plainContact } from "./support/contact-fixtures";

/**
 * The email half of "tell me when a background job finishes — by notification in
 * any case, and by email if that is enabled".
 *
 * What must hold, and why each case exists:
 *  - The in-app notification is UNCONDITIONAL. Opt-out, no Resend, a bounced
 *    send — none of them may cost the user the record of what happened.
 *  - The email is opt-in and DEFAULTS OFF (privacy-first: we never email a user
 *    who hasn't asked to be emailed).
 *  - The volume rule is a product promise printed in the Settings copy, so it is
 *    tested, not assumed: successes are never emailed and failures collapse to
 *    one email per cooldown window.
 *  - An email can never fail the job. The worker awaits notifyJobOutcome right
 *    after writing the job's terminal status; a throw there would flip a job that
 *    genuinely succeeded to "error".
 *
 * These run against the real PGlite + the real settings/notification repos —
 * only `@/lib/email/send` (the network edge) is mocked. vi.mock is hoisted, so
 * every handle is `mock`-prefixed.
 */

const mockSendEmail = vi.fn();
const mockEmailEnabled = vi.fn();
vi.mock("@/lib/email/send", () => ({
  emailEnabled: () => mockEmailEnabled(),
  ownerEmail: () => "owner@example.com",
  sendEmail: (input: { to: string; subject: string; html: string }) => mockSendEmail(input),
  // Passthrough shell: the wrapper chrome is not what these cases are about,
  // but the title still arrives here already escaped by the template.
  emailShell: (title: string, body: string) => `<h1>${title}</h1>${body}`,
}));

const TEST_USER = "test-user";
const FAILED = { status: "error", kind: "note_extraction", message: "Timed out — retry." } as const;

/** A contact plus a real pending job for it — notifications.job_id is a real FK,
 *  so these cases go through the same rows the worker would write. */
async function scene(prefix: string): Promise<{
  contactId: string;
  name: string;
  subject: JobNotificationSubject;
}> {
  const name = `${prefix} ${randomUUID()}`;
  const contactId = await createContact(plainContact(name), "manual");
  const jobId = await createExtractionJob({ contactId, kind: "note_extraction" });
  return { contactId, name, subject: { jobId, contactId, kind: "note_extraction" } };
}

/** The notification rows this run wrote for one contact. */
async function notificationsFor(contactId: string): Promise<string[]> {
  const feed = await listRecentNotifications();
  return feed.filter((n) => n.contactId === contactId).map((n) => n.title);
}

describe("shouldEmailJobOutcome — the volume rule", () => {
  // WHY: this is the promise the Settings toggle makes in words. A change that
  // starts emailing successes turns five pasted notes into five emails — the
  // fastest way to get the channel muted, taking the failures down with it.
  it("never emails a successful job, however long since the last email", () => {
    const done = { status: "done", kind: "note_extraction", factCount: 4, followUpCount: 1 } as const;
    expect(shouldEmailJobOutcome(done, { lastSentAt: null, now: 0 })).toBe(false);
    expect(shouldEmailJobOutcome(done, { lastSentAt: 0, now: 999_999_999 })).toBe(false);
  });

  it("emails failed and blocked jobs — the outcomes that ask something of the user", () => {
    expect(shouldEmailJobOutcome(FAILED, { lastSentAt: null, now: 0 })).toBe(true);
    expect(
      shouldEmailJobOutcome({ status: "blocked", kind: "enrichment" }, { lastSentAt: null, now: 0 }),
    ).toBe(true);
  });

  // WHY: the usual cause of a failure — a bad key, an outage, an exhausted AI
  // budget — fails every queued job at once, so "email every failure" is a burst.
  it("caps failures at one email per cooldown window, then allows the next", () => {
    const window = JOB_EMAIL_COOLDOWN_MINUTES * 60_000;
    expect(shouldEmailJobOutcome(FAILED, { lastSentAt: 1_000, now: 1_000 + window - 1 })).toBe(false);
    expect(shouldEmailJobOutcome(FAILED, { lastSentAt: 1_000, now: 1_000 + window })).toBe(true);
  });
});

describe("notifyJobOutcome — the email half", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockSendEmail.mockReset().mockResolvedValue({ ok: true });
    mockEmailEnabled.mockReset().mockReturnValue(true);
    await setJobEmailNotificationsEnabled(false);
    // Reset the shared anti-flood stamp so ordering between cases can't decide
    // whether an email goes out (an additive write — no DELETE anywhere here).
    await setSetting("job_email_last_sent_at", "0");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the notification but sends nothing when the user has not opted in", async () => {
    // Default OFF is the privacy rule: a user who never asked to be emailed
    // must still get the in-app record — "by notification in any case".
    const { contactId, name, subject } = await scene("Opt Out");

    await notifyJobOutcome(TEST_USER, subject, FAILED);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(await notificationsFor(contactId)).toEqual([`Extraction failed for ${name}`]);
  });

  it("is a clean no-op when the server has no email configured, notification intact", async () => {
    const { contactId, name, subject } = await scene("No Resend");
    await setJobEmailNotificationsEnabled(true);
    mockEmailEnabled.mockReturnValue(false);

    await notifyJobOutcome(TEST_USER, subject, FAILED);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(await notificationsFor(contactId)).toEqual([`Extraction failed for ${name}`]);
  });

  // WHY: contact names come from card scans and address-book imports, so they
  // are arbitrary text in an HTML document. An unescaped "<" doesn't just render
  // oddly — it lets imported data write markup into an email we send.
  it("escapes contact-derived text in the body while leaving the subject plain", async () => {
    const contactId = await createContact(plainContact("Ola <b>& Sons"), "manual");
    const jobId = await createExtractionJob({ contactId, kind: "note_extraction" });
    await setJobEmailNotificationsEnabled(true);

    await notifyJobOutcome(TEST_USER, { jobId, contactId, kind: "note_extraction" }, FAILED);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const { subject, html } = mockSendEmail.mock.calls[0][0] as { subject: string; html: string };
    // Subject is plain text — escaping it would show "&amp;" in the inbox.
    expect(subject).toBe("Extraction failed for Ola <b>& Sons");
    expect(html).toContain("Ola &lt;b&gt;&amp; Sons");
    expect(html).not.toContain("<b>");
    expect(html).toContain(`/app/people/${contactId}`);
  });

  it("does not email a successful job, but still records it in notifications", async () => {
    const { contactId, name, subject } = await scene("Quiet Success");
    await setJobEmailNotificationsEnabled(true);

    await notifyJobOutcome(TEST_USER, subject, {
      status: "done",
      kind: "note_extraction",
      factCount: 2,
      followUpCount: 0,
    });

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(await notificationsFor(contactId)).toEqual([
      `Extracted 2 facts from your note about ${name}`,
    ]);
  });

  // WHY: one broken key fails every queued note. The user needs to hear that
  // once; the per-job detail is what the notification feed is for.
  it("collapses a burst of failures into ONE email while notifying for every job", async () => {
    const { contactId, subject } = await scene("Burst");
    await setJobEmailNotificationsEnabled(true);

    await notifyJobOutcome(TEST_USER, subject, FAILED);
    await notifyJobOutcome(TEST_USER, subject, FAILED);
    await notifyJobOutcome(TEST_USER, subject, FAILED);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(await notificationsFor(contactId)).toHaveLength(3);
  });

  // WHY: the worker awaits this immediately after writing the job's terminal
  // status. A send that throws must not propagate — the job genuinely finished,
  // and the notification is already committed by the time the network is touched.
  it("survives a throwing send: job untouched, notification kept, cooldown not burned", async () => {
    const { contactId, name, subject } = await scene("Bounce");
    await setJobEmailNotificationsEnabled(true);
    await completeExtractionJob(subject.jobId, { factCount: 1, followUpCount: 0 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendEmail.mockRejectedValueOnce(new Error(`Resend rejected mail for ${name}`));

    await expect(notifyJobOutcome(TEST_USER, subject, FAILED)).resolves.toBeUndefined();

    const db = await getDb();
    const [job] = await db
      .select()
      .from(extractionJobs)
      .where(eq(extractionJobs.id, subject.jobId));
    expect(job.status).toBe("done");
    expect(await notificationsFor(contactId)).toEqual([`Extraction failed for ${name}`]);
    // Privacy rule: the failure log carries a tag and an error code/name only —
    // never the recipient, the subject or the copy (which embeds a contact name).
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("[notifications]");
    expect(logged).not.toContain(name);

    // A bounced attempt must not silence the window — the next failure still emails.
    await notifyJobOutcome(TEST_USER, subject, FAILED);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});
