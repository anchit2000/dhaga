import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import {
  countPendingConfirmations,
  createNoteSubjectConfirmation,
  createSubjectResolutionConfirmation,
  listPendingConfirmations,
} from "@/lib/repo/confirmations";
import { createContact } from "@/lib/repo/contacts";

// What decides whether a note_subject belongs in the inbox is its ORIGIN, not
// its type:
//
//  - origin "inline" — raised during web quick-add and answered right there, in
//    the same request. The inbox is not its surface, so an abandoned one would
//    be a phantom card the user has no way to clear. Keep it hidden.
//  - origin "messaging" — raised by the background batch that walks a forwarded
//    message. Nothing renders it at capture time and the bot's reply points the
//    user at the inbox, so the inbox is its ONLY surface. Hiding it strands the
//    user's note somewhere no UI can reach: the note is effectively lost.
//
// Both halves matter: drop the first and phantoms come back, drop the second
// and forwarded notes go missing.
describe("note_subject inbox visibility is decided by origin", () => {
  it("hides an inline note_subject while a normal confirmation still surfaces", async () => {
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

    // The inline note_subject row is persisted pending (so the quick-add card
    // can resolve it by id), but must not bump the badge or appear in the list.
    // Origin is omitted here on purpose: the default is "inline", and that is
    // also how every row written before the column existed reads back (NULL).
    const note = await createNoteSubjectConfirmation({
      noteBody: "Met Priya, discussed the pilot",
      subjectName: "Priya",
      question: "Which Priya is this note about?",
      options: [],
    });
    expect(await countPendingConfirmations()).toBe(before + 1); // unchanged by inline
    const pending = await listPendingConfirmations();
    expect(pending.some((c) => c.id === note.id)).toBe(false);
  });

  it("surfaces a messaging-raised note_subject in both the list and the badge", async () => {
    const before = await countPendingConfirmations();

    // A note forwarded to the messaging bot was too ambiguous to attach, so the
    // background batch raised this and told the user to answer it in the inbox.
    // If it does not show up here, that instruction is a dead end and the note
    // body — which lives only in this row's payload — is unreachable.
    const note = await createNoteSubjectConfirmation({
      noteBody: "Coffee with the founder, wants an intro to our CFO",
      subjectName: null,
      question: "Who is this note about?",
      options: [],
      origin: "messaging",
    });

    expect(await countPendingConfirmations()).toBe(before + 1);
    const pending = await listPendingConfirmations();
    const found = pending.find((c) => c.id === note.id);
    expect(found).toBeDefined();
    // The card needs the payload to render the note body and its candidates.
    expect(found?.payload.type).toBe("note_subject");
  });
});
