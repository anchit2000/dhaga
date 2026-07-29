import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { emptyContactProfile, emptyExtractedContact } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";
import { createContact, createContactProfile, getContact } from "@/lib/repo/contacts";
import { addNote, clearNoteDerivations, deleteNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { extractionOf, positionsOf, rel } from "./helpers";

/** A contact whose single current job the USER entered (no receipt). */
function manualJob(name: string, company: string): ContactProfile {
  return {
    ...emptyContactProfile(),
    name,
    positions: [
      {
        title: "Head of Ops",
        company,
        department: null,
        current: true,
        startedAt: null,
        endedAt: null,
        note: null,
        relation: null,
      },
    ],
  };
}

/**
 * Extraction auto-applies with no confirmation step. The user accepted that
 * only on the condition that AI is purely ADDITIVE: it may create a job it has
 * a receipt for, and it may never rewrite, outrank or delete one the user
 * entered. Every case here is a way that promise could quietly break.
 */
describe("extraction-derived positions are additive only", () => {
  it("never rewrites or duplicates a position the user entered", async () => {
    const tag = randomUUID();
    const company = `Acme Manual ${tag}`;
    const id = await createContactProfile(manualJob(`Manual Owner ${tag}`, company), "manual");
    const noteId = await addNote(id, "text", "heard she is a junior analyst there");

    await applyExtraction(
      id,
      noteId,
      extractionOf([
        rel({ predicate: "works_at", object: company, role_title: "Junior Analyst" }),
      ]),
    );

    // WHY: a model that mis-reads a title must not be able to overwrite (or
    // shadow with a second row) the user's own record of the same employer —
    // that (contact, company) pair is already taken, so the insert is skipped.
    const rows = await positionsOf(id);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Head of Ops");
    expect(rows[0].sourceNoteId).toBeNull();
  });

  it("keeps the user's current job primary when it adds a second employer", async () => {
    const tag = randomUUID();
    const kept = `Kept Employer ${tag}`;
    const id = await createContactProfile(manualJob(`Primary Keeper ${tag}`, kept), "manual");
    const noteId = await addNote(id, "text", "also advises another company");

    await applyExtraction(
      id,
      noteId,
      extractionOf([
        rel({
          predicate: "advisor_to",
          object: `Side Org ${tag}`,
          role_title: "Advisor",
          is_current: true,
        }),
      ]),
    );

    // WHY: computePrimaryDenorm takes the FIRST current role by sort order, so a
    // derived row has to sort after the user's. Otherwise a passing mention of a
    // side gig silently rewrites the header of a contact the user curated.
    expect(await positionsOf(id)).toHaveLength(2);
    const detail = await getContact(id);
    expect(detail?.contact.title).toBe("Head of Ops");
    expect(detail?.companyName).toBe(kept);
  });

  it("does not pile up duplicates when the same employer is re-noted or reprocessed", async () => {
    const tag = randomUUID();
    const company = `Globex ${tag}`;
    const id = await createContact(
      { ...emptyExtractedContact(), name: `Repeat Subject ${tag}` },
      "manual",
    );
    const first = await addNote(id, "text", "works at Globex");
    const job = extractionOf([
      rel({ predicate: "works_at", object: company, role_title: "Engineer", is_current: true }),
    ]);
    await applyExtraction(id, first, job);

    // A later note repeating the same employer adds nothing.
    const second = await addNote(id, "text", "still at Globex");
    await applyExtraction(id, second, job);
    expect(await positionsOf(id)).toHaveLength(1);
    expect((await positionsOf(id))[0].sourceNoteId).toBe(first);

    // WHY: the worker calls clearNoteDerivations before every re-run. If that
    // didn't drop the note's positions, reprocessing a note (or a retried job)
    // would stack a second copy of the same job on the contact.
    await clearNoteDerivations(first);
    expect(await positionsOf(id)).toHaveLength(0);
    await applyExtraction(id, first, job);
    const rows = await positionsOf(id);
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceNoteId).toBe(first);
  });

  it("deleting the note removes the job it derived and leaves the user's own", async () => {
    const tag = randomUUID();
    const own = `Own Employer ${tag}`;
    const id = await createContactProfile(manualJob(`Receipt Owner ${tag}`, own), "manual");
    const noteId = await addNote(id, "text", "used to work at Hooli");
    await applyExtraction(
      id,
      noteId,
      extractionOf([rel({ predicate: "used_to_work_at", object: `Hooli ${tag}` })]),
    );
    expect(await positionsOf(id)).toHaveLength(2);

    await deleteNote(noteId);

    // WHY: nothing derived may outlive its source note (BRD §7.4) — but the
    // delete is scoped to source_note_id, so the user's own job survives.
    const rows = await positionsOf(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Head of Ops", sourceNoteId: null });
  });
});
