import { describe, expect, it, vi } from "vitest";
import { emptyExtractedContact, type NoteExtraction } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { addNote, listOpenFollowUps } from "@/lib/repo/notes";
import {
  createSupplementConfirmation,
  dismissConfirmation,
  resolveConfirmation,
} from "@/lib/repo/confirmations";
import { syncNoteFollowUpsToCalendars } from "@/lib/repo/calendar";
import { openFollowUpIdsForNote } from "@/lib/repo/calendar/write-out/db";

/**
 * WHY this matters: a supplement confirmation is how an AI-proposed extraction
 * reaches the graph once the user says yes, and it runs the SAME applyExtraction
 * the capture path runs — so the follow-ups it writes are indistinguishable from
 * the ones a note's own extraction writes. If confirming one skips calendar
 * write-out, the user ends up with follow-ups their connected calendar never
 * learns about purely because the row arrived through the inbox instead of at
 * capture time. The second half of the promise is just as load-bearing: the sync
 * must be DEFERRED, because it makes outbound Google/Microsoft calls and a
 * tenant connection held across HTTP exhausts the max-3 pool.
 */

// Signed in, so the resolver can bind the deferred sync to the acting user. The
// tenant gate is core-only here, so request-scope still falls back to the
// in-memory PGlite and every write round-trips for real.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => ({ id: "test-user" }),
  requireUserId: async () => "test-user",
}));

// after() throws outside a real request, so stand in for the response boundary:
// collect the deferred work instead of running it, and let the test decide when
// it runs. That is what makes "not yet, then yes" observable below.
const { deferred } = vi.hoisted(() => ({ deferred: [] as (() => Promise<void>)[] }));
vi.mock("next/server", () => ({
  after: (work: () => Promise<void>) => {
    deferred.push(work);
  },
}));

// The sync's own three-phase behavior is covered by calendar-write-out.test.ts;
// stubbing it here keeps this test about the one thing it owns — whether the
// supplement path hands it the right note at the right moment.
vi.mock("@/lib/repo/calendar/write-out", () => ({
  syncFollowUpToCalendars: vi.fn(),
  syncNoteFollowUpsToCalendars: vi.fn(),
}));

async function flushDeferred(): Promise<void> {
  const work = deferred.splice(0);
  for (const item of work) await item();
}

function extractionWithFollowUp(action: string): NoteExtraction {
  return {
    facts: [],
    relationships: [],
    follow_ups: [{ action, due_hint: "tomorrow" }],
    tags: [],
  };
}

describe("confirming a supplement mirrors its follow-ups to the calendar", () => {
  it("defers write-out for the supplemented note instead of running it inline", async () => {
    const sync = vi.mocked(syncNoteFollowUpsToCalendars);
    sync.mockClear();

    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Supplement Calendar" },
      "manual",
    );
    const noteId = await addNote(contactId, "text", "Talked through the pilot scope");
    const confirmationId = await createSupplementConfirmation({
      contactId,
      extraction: extractionWithFollowUp("Send the pilot scope"),
      question: "Add these details?",
      sourceNoteId: noteId,
    });

    const result = await resolveConfirmation(confirmationId);
    expect(result).toEqual({ kind: "extraction", contactId });

    // WHY: resolveConfirmation runs inside the mutation's tenant connection.
    // Syncing here would hold that connection across a calendar HTTP call — the
    // pool-exhaustion bug this codebase keeps re-shipping. Scheduled, not run.
    expect(sync).not.toHaveBeenCalled();

    await flushDeferred();

    // WHY: after the response, the note the supplement supplemented is handed to
    // write-out, bound to the acting user (the sync opens its own scopes).
    expect(sync).toHaveBeenCalledWith("test-user", noteId);

    // ...and that note id is what actually reaches the confirmed follow-up:
    // openFollowUpIdsForNote is the very query the sync uses to expand it.
    expect(await openFollowUpIdsForNote(noteId)).toHaveLength(1);
    expect((await listOpenFollowUps(contactId))[0]?.dueDate).not.toBeNull();
  });

  it("schedules nothing for a confirmation that writes no extraction", async () => {
    // Control: if the resolver scheduled write-out unconditionally, the assertion
    // above would pass for the wrong reason. Only the extraction-writing path
    // creates follow-ups, so only it may cost a calendar round-trip.
    const sync = vi.mocked(syncNoteFollowUpsToCalendars);
    sync.mockClear();

    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Supplement Control" },
      "manual",
    );
    const noteId = await addNote(contactId, "text", "Nothing to add");
    const confirmationId = await createSupplementConfirmation({
      contactId,
      extraction: extractionWithFollowUp("Never applied"),
      question: "Add these details?",
      sourceNoteId: noteId,
    });

    // Dismissed, not resolved: nothing is written, so nothing may be synced.
    await dismissConfirmation(confirmationId);
    await flushDeferred();

    expect(sync).not.toHaveBeenCalled();
    expect(await openFollowUpIdsForNote(noteId)).toHaveLength(0);
  });
});
