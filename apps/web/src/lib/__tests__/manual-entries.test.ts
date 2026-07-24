import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { createContact } from "@/lib/repo/contacts";
import { extractionJobs, facts, notes } from "@/lib/db/schema";
import { addFactAction, createFollowUpAction } from "@/lib/actions/manual-entries";
import { listOpenFollowUps } from "@/lib/repo/notes";

// Same stubs the other action tests use: the session gate and revalidatePath
// aren't under test, and getCurrentUser=null makes request-scope fall back to
// the unscoped in-memory PGlite so the write round-trips for real.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

async function newContact(name: string): Promise<string> {
  return createContact({ ...emptyExtractedContact(), name }, "manual");
}

/**
 * The whole point of the manual path is that the app is usable with zero AI:
 * a hand-typed fact must land in the graph WITHOUT creating a note, WITHOUT
 * queuing an extraction job (a metered AI action), and WITHOUT a receipt that
 * some unrelated note deletion could later tombstone.
 */
describe("addFactAction", () => {
  it("writes a verified, full-confidence fact with a NULL receipt — and no note or extraction job", async () => {
    const contactId = await newContact("Fact Manual");
    const result = await addFactAction({}, form({ contactId, type: "personal", text: "Prefers tea" }));

    expect(result.error).toBeUndefined();
    expect(result.notice).toBeTruthy();

    const rows = await (await getDb()).select().from(facts).where(eq(facts.contactId, contactId));
    expect(rows).toHaveLength(1);
    // WHY: a manual fact has no source note. A non-null receipt would let an
    // unrelated note deletion silently tombstone something the user typed.
    expect(rows[0].sourceNoteId).toBeNull();
    // WHY: a human typed it — full confidence, already verified (no badge).
    expect(rows[0]).toMatchObject({ text: "Prefers tea", type: "personal", confidence: 1, unverified: false });

    // WHY: the manual path must bypass extraction entirely — a note or a queued
    // job would spend a metered AI action and defeat "usable with 0 AI".
    const noteRows = await (await getDb()).select().from(notes).where(eq(notes.contactId, contactId));
    expect(noteRows).toHaveLength(0);
    const jobRows = await (await getDb())
      .select()
      .from(extractionJobs)
      .where(eq(extractionJobs.contactId, contactId));
    expect(jobRows).toHaveLength(0);
  });

  it("rejects an empty fact and writes nothing", async () => {
    const contactId = await newContact("Empty Fact");
    const result = await addFactAction({}, form({ contactId, type: "personal", text: "   " }));

    expect(result.error).toBeTruthy();
    const rows = await (await getDb()).select().from(facts).where(eq(facts.contactId, contactId));
    expect(rows).toHaveLength(0);
  });

  it("rejects a fact type outside the schema enum (junk kept out of the table)", async () => {
    const contactId = await newContact("Bad Type");
    const result = await addFactAction({}, form({ contactId, type: "nonsense", text: "Something" }));

    expect(result.error).toBeTruthy();
    const rows = await (await getDb()).select().from(facts).where(eq(facts.contactId, contactId));
    expect(rows).toHaveLength(0);
  });
});

describe("createFollowUpAction", () => {
  it("creates an open follow-up with a real machine due date, no receipt, and no extraction job", async () => {
    const contactId = await newContact("FollowUp Manual");
    const due = new Date("2026-08-15T00:00:00.000Z");
    const result = await createFollowUpAction(
      {},
      form({ contactId, action: "Send the deck", dueDate: due.toISOString() }),
    );

    expect(result.error).toBeUndefined();
    expect(result.notice).toBeTruthy();

    // listOpenFollowUps filters status='open', so a hit proves the row is open.
    const open = await listOpenFollowUps(contactId);
    expect(open).toHaveLength(1);
    expect(open[0].action).toBe("Send the deck");
    // WHY: the manual path stores a machine date now, not prose — so it can drive
    // real reminders/sorting. It must round-trip as a Date at the same instant.
    expect(open[0].dueDate).toBeInstanceOf(Date);
    expect(open[0].dueDate?.getTime()).toBe(due.getTime());
    // WHY: dueHint is the LLM's free-text column; the manual path must never fill
    // it — a hint value here would mean the picker leaked into the wrong field.
    expect(open[0].dueHint).toBeNull();
    expect(open[0].sourceNoteId).toBeNull();

    const jobRows = await (await getDb())
      .select()
      .from(extractionJobs)
      .where(eq(extractionJobs.contactId, contactId));
    expect(jobRows).toHaveLength(0);
  });

  it("stores a NULL dueDate when none is given, and rejects an empty action", async () => {
    const contactId = await newContact("FollowUp NoDate");
    const empty = await createFollowUpAction({}, form({ contactId, action: "   " }));
    expect(empty.error).toBeTruthy();

    await createFollowUpAction({}, form({ contactId, action: "Ping them" }));
    const open = await listOpenFollowUps(contactId);
    expect(open).toHaveLength(1);
    expect(open[0].dueDate).toBeNull();
  });
});
