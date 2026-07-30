import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { extractionJobs } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { createExtractionJob, completeExtractionJob } from "@/lib/repo/extraction-jobs";
import {
  buildJobNotification,
  countUnreadNotifications,
  countPhrase,
  createNotification,
  dismissNotification,
  listRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyJobOutcome,
} from "@/lib/repo/notifications";
import { EXTRACTION_BLOCKED_LABEL } from "@/utils/constants/extraction-jobs";
import { plainContact } from "./support/contact-fixtures";

const TEST_USER = "test-user";

async function person(prefix: string): Promise<{ id: string; name: string }> {
  const name = `${prefix} ${randomUUID()}`;
  return { id: await createContact(plainContact(name), "manual"), name };
}

describe("job notification copy (repo/notifications/job-copy)", () => {
  // WHY: the whole value of a persisted notification is that a user who
  // navigated away can read what actually happened. "Extracted 1 facts" reads
  // like a bug and undermines that, so the pluralisation is part of the
  // contract, not cosmetics.
  it("pluralises facts and follow-ups independently", () => {
    expect(countPhrase(1, 0)).toBe("1 fact");
    expect(countPhrase(4, 0)).toBe("4 facts");
    expect(countPhrase(0, 1)).toBe("1 follow-up");
    expect(countPhrase(0, 3)).toBe("3 follow-ups");
    expect(countPhrase(4, 1)).toBe("4 facts and 1 follow-up");
  });

  it("says nothing was found instead of 'extracted 0 facts' when a run is empty", () => {
    expect(countPhrase(0, 0)).toBeNull();
    const copy = buildJobNotification(
      { status: "done", kind: "note_extraction", factCount: 0, followUpCount: 0 },
      "Priya Sharma",
    );
    expect(copy.title).toBe("No new facts in your note about Priya Sharma");
  });

  it("names the person and the counts on a finished note extraction", () => {
    const copy = buildJobNotification(
      { status: "done", kind: "note_extraction", factCount: 4, followUpCount: 1 },
      "Priya Sharma",
    );
    expect(copy.type).toBe("job_done");
    expect(copy.title).toBe("Extracted 4 facts and 1 follow-up from your note about Priya Sharma");
  });

  it("distinguishes enrichment from note extraction, both done and failed", () => {
    const done = buildJobNotification(
      { status: "done", kind: "enrichment", factCount: 2, followUpCount: 0 },
      "Priya Sharma",
    );
    expect(done.title).toBe("Web enrichment finished for Priya Sharma");
    expect(done.body).toBe("Extracted 2 facts to review.");

    const failed = buildJobNotification(
      { status: "error", kind: "enrichment", message: "Timed out — retry." },
      "Priya Sharma",
    );
    expect(failed.type).toBe("job_failed");
    expect(failed.title).toBe("Web enrichment failed for Priya Sharma");
    expect(failed.body).toBe("Timed out — retry.");
  });

  // WHY: a blocked job is terminal but NOT an error (EXTRACTION_JOB_STATUSES).
  // It must reuse the ONE existing paid-feature string, so the notification and
  // the in-page notice can never drift into two different wordings.
  it("reuses the existing blocked-job copy verbatim, as its own non-error type", () => {
    const copy = buildJobNotification({ status: "blocked", kind: "note_extraction" }, "Priya");
    expect(copy.type).toBe("job_blocked");
    expect(copy.title).toBe(EXTRACTION_BLOCKED_LABEL);
  });

  it("still produces readable copy when the subject contact is gone", () => {
    const copy = buildJobNotification(
      { status: "done", kind: "note_extraction", factCount: 1, followUpCount: 0 },
      null,
    );
    expect(copy.title).toBe("Extracted 1 fact from your note about a contact");
  });
});

describe("notification feed reads (repo/notifications/queries)", () => {
  // WHY: dismiss is the user saying "stop showing me this". A dismissed row that
  // still counted toward the badge, or reappeared in the feed, would make the
  // bell permanently wrong — the row is kept (not deleted) precisely so a
  // re-fired job can't resurrect it, which only works if reads exclude it.
  it("excludes dismissed rows from both the feed and the unread count", async () => {
    const { id: contactId, name } = await person("Nadia Notify");
    const keptId = await createNotification({
      type: "job_done",
      title: `Extracted 2 facts from your note about ${name}`,
      contactId,
    });
    const dismissedId = await createNotification({
      type: "job_failed",
      title: `Extraction failed for ${name}`,
      body: "Timed out — retry.",
      contactId,
    });

    const before = await listRecentNotifications();
    expect(before.map((n) => n.id)).toEqual(expect.arrayContaining([keptId, dismissedId]));
    const unreadBefore = await countUnreadNotifications();

    await dismissNotification(dismissedId);

    const after = await listRecentNotifications();
    expect(after.map((n) => n.id)).toContain(keptId);
    expect(after.map((n) => n.id)).not.toContain(dismissedId);
    expect(await countUnreadNotifications()).toBe(unreadBefore - 1);
  });

  // WHY: read is "I've seen it", not "hide it" — the row must stay readable in
  // the feed (that's the persisted history the user came back for) while the
  // badge stops nagging.
  it("keeps read rows in the feed but out of the unread count", async () => {
    const { id: contactId, name } = await person("Rohan Read");
    const id = await createNotification({
      type: "job_done",
      title: `Extracted 1 fact from your note about ${name}`,
      contactId,
    });
    const unreadBefore = await countUnreadNotifications();

    await markNotificationRead(id);

    const feed = await listRecentNotifications();
    expect(feed.find((n) => n.id === id)?.status).toBe("read");
    expect(await countUnreadNotifications()).toBe(unreadBefore - 1);

    await createNotification({ type: "job_done", title: "another", contactId });
    expect(await countUnreadNotifications()).toBeGreaterThan(0);
    await markAllNotificationsRead();
    expect(await countUnreadNotifications()).toBe(0);
  });

  it("hydrates the subject contact and a link target so one row renders standalone", async () => {
    const { id: contactId, name } = await person("Lena Link");
    const id = await createNotification({ type: "job_done", title: "done", contactId });
    const item = (await listRecentNotifications()).find((n) => n.id === id);
    expect(item).toBeDefined();
    expect(item?.kind).toBe("notification");
    expect(item?.contactName).toBe(name);
    expect(item?.href).toBe(`/app/people/${contactId}`);
    // ISO string, not a Date: the bell is a client component.
    expect(typeof item?.createdAt).toBe("string");
  });
});

describe("notifyJobOutcome — best effort, never fails the job", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the terminal-state notification for a real job", async () => {
    const { id: contactId, name } = await person("Ayaan Done");
    const jobId = await createExtractionJob({ contactId, kind: "note_extraction" });
    await completeExtractionJob(jobId, { factCount: 3, followUpCount: 1 });

    await notifyJobOutcome(TEST_USER, { jobId, contactId, kind: "note_extraction" }, {
      status: "done",
      kind: "note_extraction",
      factCount: 3,
      followUpCount: 1,
    });

    const feed = await listRecentNotifications();
    const item = feed.find((n) => n.contactId === contactId);
    expect(item?.title).toBe(`Extracted 3 facts and 1 follow-up from your note about ${name}`);
    expect(item?.status).toBe("unread");
  });

  // WHY: the worker awaits this call immediately after writing the job's
  // terminal status. If a notification write could throw, the outer catch in
  // processExtractionJob would flip a job that genuinely SUCCEEDED to "error"
  // (and show the user a Retry for work already done). The write is therefore
  // isolated in its own scope and every failure is swallowed.
  it("swallows a failing write and leaves the completed job alone", async () => {
    const { id: contactId } = await person("Isha Isolated");
    const jobId = await createExtractionJob({ contactId, kind: "note_extraction" });
    await completeExtractionJob(jobId, { factCount: 2, followUpCount: 0 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // A contact id that does not exist violates notifications.contact_id's FK —
    // a real write failure, not a stub.
    await expect(
      notifyJobOutcome(
        TEST_USER,
        { jobId, contactId: `missing-${randomUUID()}`, kind: "note_extraction" },
        { status: "done", kind: "note_extraction", factCount: 2, followUpCount: 0 },
      ),
    ).resolves.toBeUndefined();

    const db = await getDb();
    const [job] = await db.select().from(extractionJobs).where(eq(extractionJobs.id, jobId));
    expect(job.status).toBe("done");
    expect(job.factCount).toBe(2);

    // Privacy rule: the failure log carries no copy (titles embed contact
    // names) — only the feature tag and an error code/name.
    expect(errorSpy).toHaveBeenCalled();
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("[notifications]");
    expect(logged).not.toContain("Isha Isolated");
  });
});
