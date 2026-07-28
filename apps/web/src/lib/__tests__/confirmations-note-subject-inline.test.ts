import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import {
  countPendingConfirmations,
  createNoteSubjectConfirmation,
  createSubjectResolutionConfirmation,
  listPendingConfirmations,
} from "@/lib/repo/confirmations";
import { createContact } from "@/lib/repo/contacts";

// note_subject is resolved INLINE in quick-add at capture time — it is never
// rendered in the /app/confirmations inbox, the home "To confirm" tile, or the
// digest. So the pending list + badge count must exclude it; otherwise an
// abandoned (unresolved) one is a phantom the user can't clear from the inbox.
describe("note_subject confirmations stay out of the pending list and badge count", () => {
  it("excludes note_subject while a normal confirmation still surfaces", async () => {
    const priya = await createContact(
      { ...emptyExtractedContact(), name: "Priya Pendcount" },
      "manual",
    );

    const before = await countPendingConfirmations();

    // Control: a normal (async-extraction) confirmation DOES surface. This is
    // what makes the test able to fail — if the filter counted nothing, or
    // everything, one of these two halves would break.
    const subjectId = await createSubjectResolutionConfirmation({
      predicate: "knows",
      dstType: "contact",
      dstId: priya,
      objectName: "Priya",
      question: "Who is 'she'?",
      sourceNoteId: null,
    });
    expect(await countPendingConfirmations()).toBe(before + 1);
    expect((await listPendingConfirmations()).some((c) => c.id === subjectId)).toBe(true);

    // The note_subject row is persisted pending (so the inline card can resolve
    // it by id), but must not bump the badge or appear in the pending list.
    const note = await createNoteSubjectConfirmation({
      noteBody: "Met Priya, discussed the pilot",
      subjectName: "Priya",
      question: "Which Priya is this note about?",
      options: [],
    });
    expect(await countPendingConfirmations()).toBe(before + 1); // unchanged by note_subject
    const pending = await listPendingConfirmations();
    expect(pending.some((c) => c.id === note.id)).toBe(false);
    expect(pending.some((c) => c.payload.type === "note_subject")).toBe(false);
  });
});
