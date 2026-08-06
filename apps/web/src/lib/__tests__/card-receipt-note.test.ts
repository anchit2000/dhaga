import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { listCardImageRefs, saveCardImages } from "@/lib/repo/card-images";
import { addNote, listNotes, replaceNoteBody } from "@/lib/repo/notes";

/**
 * A card scan writes its receipt note twice: once at save time from the
 * extracted fields, then again a few seconds later with the card's verbatim
 * text, once the background transcription returns (scheduleCardTranscription).
 *
 * The second write has to be an UPDATE. The stored card photo hangs off the
 * note's id, and so does every fact the note derives — replacing the note
 * instead of its body would orphan the photo and leave the contact with two
 * receipts for one scan. These pin that.
 */
describe("card receipt note, replaced by the background transcription", () => {
  const FIELD_RECEIPT = "Scanned from a card:\nRohan Prasad Shrivastava\nDirector · STPI";
  const VERBATIM = "Rohan Prasad Shrivastava\nDirector\nSoftware Technology Parks of India\nP-1, Rajiv Gandhi Infotech Park, Pune - 411057\nFax : +91-20-22981010";

  async function seedScan() {
    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Rohan Receipt" },
      "quick_add",
    );
    const noteId = await addNote(contactId, "capture_source", FIELD_RECEIPT);
    await saveCardImages(contactId, noteId, [
      { mediaType: "image/jpeg", dataBase64: "Zm9v" },
    ]);
    return { contactId, noteId };
  }

  it("swaps the body in place, leaving one receipt rather than two", async () => {
    const { contactId, noteId } = await seedScan();

    await replaceNoteBody(noteId, VERBATIM);

    const notes = await listNotes(contactId);
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe(noteId);
    expect(notes[0].body).toBe(VERBATIM);
    // Still the capture receipt — not demoted to a plain note by the rewrite.
    expect(notes[0].kind).toBe("capture_source");
  });

  it("keeps the stored card photo attached to its receipt", async () => {
    const { contactId, noteId } = await seedScan();

    await replaceNoteBody(noteId, VERBATIM);

    // The photo is linked by note id; had the transcription created a new note,
    // the image would still point at the old one and drop off the contact.
    expect(await listCardImageRefs(contactId)).toHaveLength(1);
  });

  it("carries the address and fax the field-derived receipt never had", async () => {
    const { contactId, noteId } = await seedScan();
    expect(FIELD_RECEIPT).not.toContain("Rajiv Gandhi");

    await replaceNoteBody(noteId, VERBATIM);

    // The whole point of the second call: text that maps to no extracted field
    // becomes searchable. If this ever reads false, the receipt has silently
    // gone back to being a summary of the fields.
    const [note] = await listNotes(contactId);
    expect(note.body).toContain("Rajiv Gandhi Infotech Park");
    expect(note.body).toContain("Fax");
  });
});
